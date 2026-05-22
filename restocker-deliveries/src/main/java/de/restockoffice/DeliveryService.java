package de.restockoffice;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class DeliveryService {

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
    public Tour syncTodayOrders(String restockerName, String authorizationHeader) {
        if (restockerName == null || restockerName.isBlank()) {
            throw new BadRequestException("Restocker fehlt.");
        }

        LocalDate today = LocalDate.now();
        Tour tour = findTodayOpenTour(restockerName);
        int nextStopOrder = nextStopOrder(tour);

        List<OrderDto> activeOrders = orderClient.getActiveOrders(authorizationHeader);
        if (activeOrders == null || activeOrders.isEmpty()) {
            return tour;
        }

        Map<DeliveryGroupKey, DeliveryGroup> groupedOrders = new LinkedHashMap<>();

        for (OrderDto order : activeOrders) {
            if (!isActiveOrder(order) || order.id == null || order.customerId == null) {
                continue;
            }

            UserDto user = tryLoadUser(order.customerId, authorizationHeader);
            if (!isDueToday(order, user, today)) {
                continue;
            }

            if (deliveryContainsOrderOnDate(order.id.toString(), today)) {
                continue;
            }

            DeliveryGroupKey groupKey = new DeliveryGroupKey(order.customerId, today);
            DeliveryGroup group = groupedOrders.computeIfAbsent(groupKey, ignored -> new DeliveryGroup());
            group.orders.add(order);
        }

        for (Map.Entry<DeliveryGroupKey, DeliveryGroup> entry : groupedOrders.entrySet()) {
            if (tour == null) {
                tour = new Tour();
                tour.restockerName = restockerName;
                tour.tourDate = today;
                tour.persist();
            }

            DeliveryGroupKey groupKey = entry.getKey();
            DeliveryGroup group = entry.getValue();
            Delivery delivery = findOpenDeliveryForCustomerInTour(groupKey.customerId(), tour);

            if (delivery == null) {
                delivery = new Delivery();
                delivery.orderId = joinedOrderIds(group.orders);
                delivery.userId = groupKey.customerId();
                delivery.tour = tour;
                delivery.stopOrder = nextStopOrder++;

                for (OrderDto order : group.orders) {
                    delivery.addItem(createDeliveryItem(order));
                }

                delivery.persist();
                tour.deliveries.add(delivery);
            } else {
                appendOrdersToDelivery(delivery, group.orders);
            }
        }

        return tour;
    }

    @Transactional
    public Delivery collectPackage(UUID deliveryId) {
        Delivery delivery = findDeliveryOrThrow(deliveryId);
        if (delivery.collected) {
            throw new BadRequestException("Paket wurde bereits eingesammelt.");
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

    public DeliveryDetailDto getDeliveryDetail(UUID deliveryId, String authorizationHeader) {
        Delivery delivery = findDeliveryOrThrow(deliveryId);
        UserDto user = tryLoadUser(delivery.userId, authorizationHeader);
        OrderDto order = tryLoadOrder(firstOrderId(delivery.orderId), authorizationHeader);
        Map<String, ArticleDto> articleCache = new HashMap<>();

        return toDetailDto(delivery, user, order, articleCache);
    }

    public List<DeliveryDetailDto> getTourDeliveryDetails(UUID tourId, String authorizationHeader) {
        List<Delivery> deliveries = Delivery.findByTour(tourId);
        Map<String, ArticleDto> articleCache = new HashMap<>();
        return deliveries.stream()
                .map(delivery -> {
                    UserDto user = tryLoadUser(delivery.userId, authorizationHeader);
                    OrderDto order = tryLoadOrder(firstOrderId(delivery.orderId), authorizationHeader);
                    return toDetailDto(delivery, user, order, articleCache);
                })
                .collect(Collectors.toList());
    }

    private DeliveryDetailDto toDetailDto(
            Delivery delivery,
            UserDto user,
            OrderDto order,
            Map<String, ArticleDto> articleCache
    ) {
        DeliveryDetailDto dto = new DeliveryDetailDto();
        dto.id = delivery.id;
        dto.orderId = delivery.orderId;
        dto.userId = delivery.userId;
        dto.stopOrder = delivery.stopOrder;
        dto.collected = delivery.collected;
        dto.collectedAt = delivery.collectedAt;
        dto.deliveredAt = delivery.deliveredAt;

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
        dto.deliveryTime = user != null ? user.deliveryTime : null;
        dto.deliveryDate = delivery.tour != null && delivery.tour.tourDate != null
                ? delivery.tour.tourDate.toString()
                : null;
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

    private int nextStopOrder(Tour tour) {
        if (tour == null) {
            return 1;
        }

        return Delivery.findByTour(tour.id).stream()
                .mapToInt(delivery -> delivery.stopOrder)
                .max()
                .orElse(0) + 1;
    }

    private boolean isActiveOrder(OrderDto order) {
        return order != null && (order.status == null || "ACTIVE".equalsIgnoreCase(order.status));
    }

    private UserDto tryLoadUser(String userId, String authorizationHeader) {
        try {
            return userClient.getCustomerAddressForRestocker(userId, authorizationHeader);
        } catch (RuntimeException exception) {
            return null;
        }
    }

    private OrderDto tryLoadOrder(String orderId, String authorizationHeader) {
        try {
            return orderClient.getOrderById(parseOrderId(orderId), authorizationHeader);
        } catch (RuntimeException exception) {
            return null;
        }
    }

    private boolean isDueToday(OrderDto order, UserDto user, LocalDate today) {
        if (wasCreatedToday(order, today)) {
            return true;
        }

        if (user != null && user.deliveryDay != null && !user.deliveryDay.isBlank()) {
            return isGermanDeliveryDayToday(user.deliveryDay, today) && isIntervalDue(order, today);
        }

        return isIntervalDue(order, today);
    }

    private boolean isGermanDeliveryDayToday(String deliveryDay, LocalDate today) {
        String normalized = deliveryDay.trim().toLowerCase();
        return switch (today.getDayOfWeek()) {
            case MONDAY -> normalized.equals("montag");
            case TUESDAY -> normalized.equals("dienstag");
            case WEDNESDAY -> normalized.equals("mittwoch");
            case THURSDAY -> normalized.equals("donnerstag");
            case FRIDAY -> normalized.equals("freitag");
            case SATURDAY -> normalized.equals("samstag");
            case SUNDAY -> normalized.equals("sonntag");
        };
    }

    private boolean wasCreatedToday(OrderDto order, LocalDate today) {
        return order.createdAt != null && order.createdAt.toLocalDate().isEqual(today);
    }

    private boolean isIntervalDue(OrderDto order, LocalDate today) {
        if (order.createdAt == null || order.interval == null || order.interval <= 0) {
            return true;
        }

        long daysSinceCreation = ChronoUnit.DAYS.between(order.createdAt.toLocalDate(), today);
        return daysSinceCreation >= 0 && daysSinceCreation % order.interval == 0;
    }

    private boolean deliveryContainsOrderOnDate(String orderId, LocalDate deliveryDate) {
        return Delivery.<Delivery>find("tour.tourDate = ?1", deliveryDate).stream()
                .anyMatch(delivery -> splitOrderIds(delivery.orderId).contains(orderId));
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

    private Delivery findOpenDeliveryForCustomerInTour(String customerId, Tour tour) {
        return Delivery.find(
                "userId = ?1 and tour.id = ?2 and deliveredAt is null",
                customerId,
                tour.id
        ).firstResult();
    }

    private void appendOrdersToDelivery(Delivery delivery, List<OrderDto> orders) {
        List<String> existingOrderIds = splitOrderIds(delivery.orderId);

        for (OrderDto order : orders) {
            String orderId = order.id.toString();
            if (existingOrderIds.contains(orderId)) {
                continue;
            }

            DeliveryItem item = createDeliveryItem(order);
            delivery.addItem(item);
            existingOrderIds.add(orderId);
        }

        delivery.orderId = String.join(",", existingOrderIds);
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

    private String firstOrderId(String orderIds) {
        List<String> ids = splitOrderIds(orderIds);
        return ids.isEmpty() ? orderIds : ids.get(0);
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

    private Long parseOrderId(String orderId) {
        try {
            return Long.valueOf(orderId);
        } catch (NumberFormatException exception) {
            throw new BadRequestException("Ungueltige Order-ID: " + orderId);
        }
    }
}
