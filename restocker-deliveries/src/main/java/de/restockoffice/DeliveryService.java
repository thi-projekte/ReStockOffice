package de.restockoffice;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class DeliveryService {

    private static final int PLANNING_HORIZON_DAYS = 28;
    private static final String TEST_ORDER_PREFIX = "test-delivery-";
    private static final String DEFAULT_TEST_CUSTOMER_ONE = "3e6572a7-3852-42e3-81eb-17e7f9622kk8";
    private static final String DEFAULT_TEST_CUSTOMER_TWO = "c831fce5-56a3-443e-a27f-cc769a1ed0d7";

    @Inject
    @RestClient
    UserClient userClient;

    @Inject
    @RestClient
    OrderClient orderClient;

    @Inject
    @RestClient
    ArticleClient articleClient;

    @Transactional
    public Tour createTour(Tour tour) {
        tour.persist();
        return tour;
    }

    @Transactional
    public Map<String, Long> deleteAllDeliveries() {
        long deletedItems = DeliveryItem.deleteAll();
        long deletedDeliveries = Delivery.deleteAll();
        long deletedTours = Tour.deleteAll();

        return Map.of(
                "deletedItems", deletedItems,
                "deletedDeliveries", deletedDeliveries,
                "deletedTours", deletedTours
        );
    }

    @Transactional
    public List<DeliveryDetailDto> createTestDeliveries(
            String deliveryDateValue,
            String firstCustomerId,
            String secondCustomerId,
            String authorizationHeader
    ) {
        LocalDate deliveryDate = parseTestDeliveryDate(deliveryDateValue);
        List<Delivery> existingTestDeliveries = Delivery.list(
                "orderId like ?1",
                TEST_ORDER_PREFIX + "%"
        );

        for (Delivery delivery : existingTestDeliveries) {
            DeliveryItem.delete("delivery.id", delivery.id);
        }
        Delivery.delete("orderId like ?1", TEST_ORDER_PREFIX + "%");

        Delivery firstDelivery = createOpenTestDelivery(
                TEST_ORDER_PREFIX + "one",
                normalizeOptionalCustomerId(firstCustomerId, DEFAULT_TEST_CUSTOMER_ONE),
                deliveryDate,
                List.of(
                        createTestDeliveryItem("10086", "Kassenbuch A4", 1, "Stueck"),
                        createTestDeliveryItem("10003", "Textmarker-Set (4 Farben)", 1, "Stueck")
                )
        );
        Delivery secondDelivery = createOpenTestDelivery(
                TEST_ORDER_PREFIX + "two",
                normalizeOptionalCustomerId(secondCustomerId, DEFAULT_TEST_CUSTOMER_TWO),
                deliveryDate,
                List.of(
                        createTestDeliveryItem("10088", "Gummizugmappe A3", 1, "Stueck"),
                        createTestDeliveryItem("10007", "Klarsichthuellen A4 oben offen", 10, "Stueck")
                )
        );

        firstDelivery.persist();
        secondDelivery.persist();

        return toDetailDtos(List.of(firstDelivery, secondDelivery), authorizationHeader);
    }

    @Transactional
    public Tour startTour(UUID tourId) {
        Tour tour = findTourOrThrow(tourId);
        if (!tour.allPackagesCollected()) {
            throw new BadRequestException("Nicht alle Pakete wurden eingesammelt.");
        }
        tour.start();
        return tour;
    }

    @Transactional
    public Tour endTour(UUID tourId, BigDecimal earnings) {
        Tour tour = findTourOrThrow(tourId);
        tour.end(earnings);
        return tour;
    }

    public List<Tour> getTodayToursByRestocker(String restockerName) {
        return Tour.findTodayByRestocker(restockerName);
    }

    @Transactional
    public List<DeliveryDetailDto> getOpenDeliveries(String authorizationHeader) {
        ensurePlanningHorizon(authorizationHeader);

        LocalDate today = LocalDate.now();
        LocalDate horizonEnd = today.plusDays(PLANNING_HORIZON_DAYS);
        return toDetailDtos(Delivery.findOpenBetween(today, horizonEnd), authorizationHeader);
    }

    @Transactional
    public List<DeliveryDetailDto> getAssignedDeliveries(String restockerName, String authorizationHeader) {
        validateRestockerName(restockerName);
        ensurePlanningHorizon(authorizationHeader);

        return toDetailDtos(Delivery.findAssignedToRestocker(restockerName), authorizationHeader);
    }

    @Transactional
    public DeliveryDetailDto acceptDelivery(UUID deliveryId, String restockerName, String authorizationHeader) {
        validateRestockerName(restockerName);

        Delivery delivery = findDeliveryOrThrow(deliveryId);
        if (delivery.isDelivered()) {
            throw new BadRequestException("Diese Lieferung wurde bereits ausgeliefert.");
        }

        if (delivery.tour != null) {
            if (!restockerName.equals(delivery.tour.restockerName)) {
                throw new BadRequestException("Diese Lieferung wurde bereits von einem anderen Restocker angenommen.");
            }

            return toDetailDtoWithFreshData(delivery, authorizationHeader);
        }

        LocalDate deliveryDate = resolveDeliveryDate(delivery);
        delivery.deliveryDate = deliveryDate;

        Tour tour = findOrCreateOpenTour(restockerName, deliveryDate);
        delivery.stopOrder = nextStopOrder(tour);
        delivery.markAccepted(tour);
        tour.deliveries.add(delivery);

        return toDetailDtoWithFreshData(delivery, authorizationHeader);
    }

    @Transactional
    public Tour syncTodayOrders(String restockerName, String authorizationHeader) {
        validateRestockerName(restockerName);
        ensurePlanningHorizon(authorizationHeader);
        return findTodayOpenTour(restockerName);
    }

    @Transactional
    public Delivery collectPackage(UUID deliveryId) {
        Delivery delivery = findDeliveryOrThrow(deliveryId);
        if (delivery.collected) {
            return delivery;
        }
        delivery.markCollected();
        return delivery;
    }

    @Transactional
    public DeliveryItem markItemDelivered(UUID itemId) {
        DeliveryItem item = DeliveryItem.findById(itemId);
        if (item == null) {
            throw new NotFoundException("Artikel nicht gefunden: " + itemId);
        }
        item.markDelivered();
        return item;
    }

    @Transactional
    public Delivery confirmDelivery(UUID deliveryId) {
        Delivery delivery = findDeliveryOrThrow(deliveryId);
        if (!delivery.allItemsDelivered()) {
            throw new BadRequestException("Nicht alle Artikel wurden abgehakt.");
        }
        delivery.markDelivered();
        return delivery;
    }

    @Transactional
    public DeliveryDetailDto getDeliveryDetail(UUID deliveryId, String authorizationHeader) {
        Delivery delivery = findDeliveryOrThrow(deliveryId);
        return toDetailDtoWithFreshData(delivery, authorizationHeader);
    }

    @Transactional
    public List<DeliveryDetailDto> getTourDeliveryDetails(UUID tourId, String authorizationHeader) {
        return toDetailDtos(Delivery.findByTour(tourId), authorizationHeader);
    }

    private void ensurePlanningHorizon(String authorizationHeader) {
        LocalDate today = LocalDate.now();
        LocalDate horizonEnd = today.plusDays(PLANNING_HORIZON_DAYS);
        List<OrderDto> activeOrders = orderClient.getActiveOrders(authorizationHeader);
        if (activeOrders == null || activeOrders.isEmpty()) {
            return;
        }

        Map<String, UserDto> customerCache = new HashMap<>();
        Map<DeliveryGroupKey, DeliveryGroup> groupedOrders = new LinkedHashMap<>();

        for (OrderDto order : activeOrders) {
            if (!isPlannableOrder(order)) {
                continue;
            }

            UserDto user = loadCachedUser(order.customerId, customerCache, authorizationHeader);
            for (LocalDate deliveryDate : calculateDueDates(order, user, today, horizonEnd)) {
                DeliveryGroupKey groupKey = new DeliveryGroupKey(order.customerId, deliveryDate);
                DeliveryGroup group = groupedOrders.computeIfAbsent(groupKey, ignored -> new DeliveryGroup());
                group.orders.add(order);
            }
        }

        for (Map.Entry<DeliveryGroupKey, DeliveryGroup> entry : groupedOrders.entrySet()) {
            upsertPlannedDelivery(entry.getKey(), entry.getValue().orders);
        }
    }

    private void upsertPlannedDelivery(DeliveryGroupKey groupKey, List<OrderDto> orders) {
        Delivery delivery = Delivery.findByCustomerAndDate(groupKey.customerId(), groupKey.deliveryDate());

        if (delivery == null) {
            delivery = new Delivery();
            delivery.orderId = joinedOrderIds(orders);
            delivery.userId = groupKey.customerId();
            delivery.deliveryDate = groupKey.deliveryDate();
            delivery.stopOrder = 0;

            for (OrderDto order : orders) {
                delivery.addItem(createDeliveryItem(order));
            }

            delivery.persist();
            return;
        }

        if (delivery.deliveryDate == null) {
            delivery.deliveryDate = groupKey.deliveryDate();
        }

        appendOrdersToDelivery(delivery, orders);
    }

    private List<LocalDate> calculateDueDates(
            OrderDto order,
            UserDto user,
            LocalDate startDate,
            LocalDate endDate
    ) {
        List<LocalDate> dueDates = new ArrayList<>();
        DayOfWeek deliveryDay = resolveDeliveryDay(user, order);
        LocalDate anchorDate = order.createdAt != null ? order.createdAt.toLocalDate() : startDate;
        LocalDate firstDeliveryDate = firstDateOnOrAfter(anchorDate, deliveryDay);
        int intervalWeeks = order.interval != null && order.interval > 0 ? order.interval : 1;

        LocalDate deliveryDate = firstDeliveryDate;
        while (deliveryDate.isBefore(startDate)) {
            deliveryDate = deliveryDate.plusWeeks(intervalWeeks);
        }

        while (!deliveryDate.isAfter(endDate)) {
            dueDates.add(deliveryDate);
            deliveryDate = deliveryDate.plusWeeks(intervalWeeks);
        }

        return dueDates;
    }

    private DayOfWeek resolveDeliveryDay(UserDto user, OrderDto order) {
        DayOfWeek configuredDeliveryDay = parseDeliveryDay(user != null ? user.deliveryDay : null);
        if (configuredDeliveryDay != null) {
            return configuredDeliveryDay;
        }

        if (order.createdAt != null) {
            return order.createdAt.getDayOfWeek();
        }

        return LocalDate.now().getDayOfWeek();
    }

    private DayOfWeek parseDeliveryDay(String deliveryDay) {
        if (deliveryDay == null || deliveryDay.isBlank()) {
            return null;
        }

        String normalized = deliveryDay.trim().toLowerCase(Locale.GERMAN);
        return switch (normalized) {
            case "montag", "monday", "mo" -> DayOfWeek.MONDAY;
            case "dienstag", "tuesday", "di" -> DayOfWeek.TUESDAY;
            case "mittwoch", "wednesday", "mi" -> DayOfWeek.WEDNESDAY;
            case "donnerstag", "thursday", "do" -> DayOfWeek.THURSDAY;
            case "freitag", "friday", "fr" -> DayOfWeek.FRIDAY;
            case "samstag", "saturday", "sa" -> DayOfWeek.SATURDAY;
            case "sonntag", "sunday", "so" -> DayOfWeek.SUNDAY;
            default -> null;
        };
    }

    private LocalDate firstDateOnOrAfter(LocalDate anchorDate, DayOfWeek deliveryDay) {
        LocalDate deliveryDate = anchorDate;
        while (deliveryDate.getDayOfWeek() != deliveryDay) {
            deliveryDate = deliveryDate.plusDays(1);
        }

        return deliveryDate;
    }

    private List<DeliveryDetailDto> toDetailDtos(List<Delivery> deliveries, String authorizationHeader) {
        Map<String, UserDto> userCache = new HashMap<>();
        Map<String, ArticleDto> articleCache = new HashMap<>();

        return deliveries.stream()
                .map(delivery -> {
                    UserDto user = loadCachedUser(delivery.userId, userCache, authorizationHeader);
                    return toDetailDto(delivery, user, articleCache);
                })
                .collect(Collectors.toList());
    }

    private DeliveryDetailDto toDetailDtoWithFreshData(Delivery delivery, String authorizationHeader) {
        UserDto user = tryLoadUser(delivery.userId, authorizationHeader);
        return toDetailDto(delivery, user, new HashMap<>());
    }

    private DeliveryDetailDto toDetailDto(
            Delivery delivery,
            UserDto user,
            Map<String, ArticleDto> articleCache
    ) {
        DeliveryDetailDto dto = new DeliveryDetailDto();
        dto.id = delivery.id;
        dto.orderId = delivery.orderId;
        dto.userId = delivery.userId;
        dto.stopOrder = delivery.stopOrder;
        dto.collected = delivery.collected;
        dto.collectedAt = delivery.collectedAt;
        dto.acceptedAt = delivery.acceptedAt;
        dto.deliveredAt = delivery.deliveredAt;
        dto.restockerName = delivery.tour != null ? delivery.tour.restockerName : null;

        dto.companyName = valueOrEmpty(user != null ? user.companyName : null);
        dto.street = valueOrEmpty(user != null ? user.street : null);
        dto.houseNumber = valueOrEmpty(user != null ? user.houseNumber : null);
        dto.postalCode = valueOrEmpty(user != null ? user.postalCode : null);
        dto.city = valueOrEmpty(user != null ? user.city : null);
        dto.country = valueOrEmpty(user != null ? user.country : null);
        dto.phoneNumber = valueOrEmpty(user != null ? user.phoneNumber : null);
        dto.contactPerson = valueOrEmpty(user != null ? user.roleInCompany : null);
        dto.deliveryHint = valueOrEmpty(user != null ? user.deliveryHint : null);
        dto.deliveryDay = valueOrEmpty(user != null ? user.deliveryDay : null);
        dto.deliveryTime = valueOrEmpty(user != null ? user.deliveryTime : null);
        dto.deliveryDate = resolveDeliveryDate(delivery).toString();
        dto.items = delivery.items.stream().map(item -> {
            DeliveryDetailDto.DeliveryItemDetailDto detailItem = new DeliveryDetailDto.DeliveryItemDetailDto();
            ArticleDto article = loadArticle(item.articleNumber, articleCache);
            detailItem.id = item.id;
            detailItem.articleNumber = item.articleNumber;
            detailItem.delivered = item.delivered;
            detailItem.name = valueOrFallback(
                    item.name,
                    article != null ? article.name : fallbackArticleName(item.articleNumber)
            );
            detailItem.quantity = item.quantity;
            detailItem.unit = valueOrFallback(
                    item.unit,
                    article != null ? article.unit : "Stueck"
            );
            return detailItem;
        }).collect(Collectors.toList());

        return dto;
    }

    private Tour findTourOrThrow(UUID tourId) {
        Tour tour = Tour.findById(tourId);
        if (tour == null) {
            throw new NotFoundException("Tour nicht gefunden: " + tourId);
        }
        return tour;
    }

    private Delivery findDeliveryOrThrow(UUID deliveryId) {
        Delivery delivery = Delivery.findById(deliveryId);
        if (delivery == null) {
            throw new NotFoundException("Lieferung nicht gefunden: " + deliveryId);
        }
        return delivery;
    }

    private Tour findTodayOpenTour(String restockerName) {
        return Tour.find(
                "restockerName = ?1 and tourDate = ?2 and endTime is null",
                restockerName,
                LocalDate.now()
        ).firstResult();
    }

    private Tour findOrCreateOpenTour(String restockerName, LocalDate deliveryDate) {
        Tour tour = Tour.find(
                "restockerName = ?1 and tourDate = ?2 and endTime is null",
                restockerName,
                deliveryDate
        ).firstResult();

        if (tour != null) {
            return tour;
        }

        tour = new Tour();
        tour.restockerName = restockerName;
        tour.tourDate = deliveryDate;
        tour.persist();
        return tour;
    }

    private LocalDate resolveDeliveryDate(Delivery delivery) {
        if (delivery.deliveryDate != null) {
            return delivery.deliveryDate;
        }

        if (delivery.tour != null && delivery.tour.tourDate != null) {
            return delivery.tour.tourDate;
        }

        return LocalDate.now();
    }

    private int nextStopOrder(Tour tour) {
        if (tour == null || tour.id == null) {
            return 1;
        }

        return Delivery.findByTour(tour.id).stream()
                .mapToInt(delivery -> delivery.stopOrder)
                .max()
                .orElse(0) + 1;
    }

    private boolean isPlannableOrder(OrderDto order) {
        return isActiveOrder(order)
                && order.id != null
                && order.customerId != null
                && !order.customerId.isBlank()
                && order.productId != null
                && !order.productId.isBlank();
    }

    private boolean isActiveOrder(OrderDto order) {
        return order != null && (order.status == null || "ACTIVE".equalsIgnoreCase(order.status));
    }

    private void validateRestockerName(String restockerName) {
        if (restockerName == null || restockerName.isBlank()) {
            throw new BadRequestException("Restocker fehlt.");
        }
    }

    private UserDto loadCachedUser(
            String userId,
            Map<String, UserDto> userCache,
            String authorizationHeader
    ) {
        if (!userCache.containsKey(userId)) {
            userCache.put(userId, tryLoadUser(userId, authorizationHeader));
        }

        return userCache.get(userId);
    }

    private UserDto tryLoadUser(String userId, String authorizationHeader) {
        try {
            return userClient.getCustomerAddressForRestocker(userId, authorizationHeader);
        } catch (RuntimeException exception) {
            return createTestCustomerFallback(userId);
        }
    }

    private UserDto createTestCustomerFallback(String userId) {
        if (DEFAULT_TEST_CUSTOMER_ONE.equals(userId)) {
            UserDto user = new UserDto();
            user.userId = userId;
            user.companyName = "Muster GmbH";
            user.street = "Teststrasse";
            user.houseNumber = "12";
            user.postalCode = "85049";
            user.city = "Ingolstadt";
            user.country = "Deutschland";
            user.phoneNumber = "+49 841 123456";
            user.roleInCompany = "Warenannahme";
            user.deliveryHint = "Bitte am Empfang melden.";
            user.deliveryDay = "Samstag";
            user.deliveryTime = "10:00";
            return user;
        }

        if (DEFAULT_TEST_CUSTOMER_TWO.equals(userId)) {
            UserDto user = new UserDto();
            user.userId = userId;
            user.companyName = "Beispiel Office AG";
            user.street = "Demoweg";
            user.houseNumber = "7";
            user.postalCode = "90402";
            user.city = "Nuernberg";
            user.country = "Deutschland";
            user.phoneNumber = "+49 911 987654";
            user.roleInCompany = "Office Management";
            user.deliveryHint = "Anlieferung ueber Seiteneingang.";
            user.deliveryDay = "Samstag";
            user.deliveryTime = "14:00";
            return user;
        }

        return null;
    }

    private DeliveryItem createDeliveryItem(OrderDto order) {
        DeliveryItem item = new DeliveryItem();
        ArticleDto article = tryLoadArticle(order.productId);
        item.articleNumber = order.productId;
        item.name = valueOrFallback(
                article != null ? article.name : null,
                fallbackArticleName(order.productId)
        );
        item.unit = valueOrFallback(
                article != null ? article.unit : null,
                "Stueck"
        );
        item.quantity = order.quantity != null && order.quantity > 0 ? order.quantity : 1;
        return item;
    }

    private Delivery createOpenTestDelivery(
            String orderId,
            String customerId,
            LocalDate deliveryDate,
            List<DeliveryItem> items
    ) {
        Delivery delivery = new Delivery();
        delivery.orderId = orderId;
        delivery.userId = customerId;
        delivery.deliveryDate = deliveryDate;
        delivery.stopOrder = 0;
        delivery.collected = false;
        delivery.collectedAt = null;
        delivery.acceptedAt = null;
        delivery.deliveredAt = null;
        delivery.tour = null;

        for (DeliveryItem item : items) {
            item.delivered = false;
            delivery.addItem(item);
        }

        return delivery;
    }

    private DeliveryItem createTestDeliveryItem(
            String articleNumber,
            String name,
            int quantity,
            String unit
    ) {
        DeliveryItem item = new DeliveryItem();
        item.articleNumber = articleNumber;
        item.name = name;
        item.quantity = quantity;
        item.unit = unit;
        item.delivered = false;
        return item;
    }

    private LocalDate parseTestDeliveryDate(String deliveryDateValue) {
        if (deliveryDateValue == null || deliveryDateValue.isBlank()) {
            return LocalDate.now();
        }

        try {
            return LocalDate.parse(deliveryDateValue.trim());
        } catch (RuntimeException exception) {
            throw new BadRequestException("deliveryDate muss im Format YYYY-MM-DD angegeben werden.");
        }
    }

    private String normalizeOptionalCustomerId(String customerId, String fallbackCustomerId) {
        return customerId == null || customerId.isBlank()
                ? fallbackCustomerId
                : customerId.trim();
    }

    private void appendOrdersToDelivery(Delivery delivery, List<OrderDto> orders) {
        List<String> existingOrderIds = splitOrderIds(delivery.orderId);

        for (OrderDto order : orders) {
            String orderId = order.id.toString();
            if (existingOrderIds.contains(orderId)) {
                updateExistingItem(delivery, order);
                continue;
            }

            DeliveryItem item = createDeliveryItem(order);
            delivery.addItem(item);
            existingOrderIds.add(orderId);
        }

        delivery.orderId = String.join(",", existingOrderIds);
    }

    private void updateExistingItem(Delivery delivery, OrderDto order) {
        if (order.productId == null) {
            return;
        }

        DeliveryItem existingItem = delivery.items.stream()
                .filter(item -> order.productId.equals(item.articleNumber))
                .findFirst()
                .orElse(null);
        if (existingItem == null || existingItem.delivered) {
            return;
        }

        DeliveryItem updatedItem = createDeliveryItem(order);
        existingItem.name = updatedItem.name;
        existingItem.unit = updatedItem.unit;
        existingItem.quantity = updatedItem.quantity;
    }

    private String joinedOrderIds(List<OrderDto> orders) {
        return orders.stream()
                .map(order -> order.id.toString())
                .collect(Collectors.joining(","));
    }

    private List<String> splitOrderIds(String orderIds) {
        if (orderIds == null || orderIds.isBlank()) {
            return new ArrayList<>();
        }

        return java.util.Arrays.stream(orderIds.split(","))
                .map(String::trim)
                .filter(orderId -> !orderId.isBlank())
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private ArticleDto loadArticle(String articleNumber, Map<String, ArticleDto> articleCache) {
        if (articleNumber == null || articleNumber.isBlank()) {
            return null;
        }

        if (articleCache.containsKey(articleNumber)) {
            return articleCache.get(articleNumber);
        }

        ArticleDto article = tryLoadArticle(articleNumber);
        articleCache.put(articleNumber, article);
        return article;
    }

    private ArticleDto tryLoadArticle(String articleNumber) {
        try {
            return articleClient.getArticleByProductId(articleNumber);
        } catch (RuntimeException exception) {
            return null;
        }
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    private String valueOrFallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String fallbackArticleName(String articleNumber) {
        return "Artikel " + articleNumber;
    }

    private record DeliveryGroupKey(String customerId, LocalDate deliveryDate) {
    }

    private static class DeliveryGroup {
        final List<OrderDto> orders = new ArrayList<>();
    }
}
