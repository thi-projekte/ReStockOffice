package de.restockoffice.delivery;

import de.restockoffice.article.ArticleClient;
import de.restockoffice.article.ArticleDto;
import de.restockoffice.order.OrderClient;
import de.restockoffice.order.OrderDto;
import de.restockoffice.user.UserClient;
import de.restockoffice.user.UserDto;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@ApplicationScoped
public class DeliveryService {

    private static final Logger LOG = Logger.getLogger(DeliveryService.class);
    static final int PLANNING_HORIZON_DAYS = 14;
    private static final String DEFAULT_UNIT = "Stück";

    @Inject
    DeliveryReportingService reportingService;

    @Inject
    DeliveryTourService tourService;

    @Inject
    DeliveryDetailAssembler detailAssembler;

    @Inject
    @RestClient
    UserClient userClient;

    @Inject
    @RestClient
    OrderClient orderClient;

    @Inject
    @RestClient
    ArticleClient articleClient;

    @Inject
    EntityManager entityManager;

    @Transactional
    public Tour createTour(Tour tour) {
        return tourService.createTour(tour);
    }

    @Transactional
    public Tour startTour(UUID tourId) {
        return tourService.startTour(tourId);
    }

    @Transactional
    public Tour endTour(UUID tourId, BigDecimal earnings) {
        return tourService.endTour(tourId, earnings);
    }

    public List<Tour> getTodayToursByRestocker(String restockerName) {
        return tourService.getTodayToursByRestocker(restockerName);
    }

    @Transactional
    public List<DeliveryDetailDto> getOpenDeliveries(String authorizationHeader) {
        ensurePlanningHorizon(authorizationHeader);

        LocalDate today = LocalDate.now();
        LocalDate horizonEnd = today.plusDays(PLANNING_HORIZON_DAYS);
        return detailAssembler.toDetailDtos(Delivery.findOpenBetween(today, horizonEnd), authorizationHeader);
    }

    @Transactional
    public List<DeliveryDetailDto> getAllDeliveries(String authorizationHeader) {
        return detailAssembler.toDetailDtos(Delivery.list("order by deliveryDate desc, userId asc"), authorizationHeader);
    }

    @Transactional
    public List<DeliveredArticleSummaryDto> getDeliveredArticleSummaryForPreviousMonth(String customerId) {
        return reportingService.getDeliveredArticleSummaryForPreviousMonth(customerId);
    }

    @Transactional
    public CustomerDeliveryOverviewDto getCustomerDeliveryOverview(String customerId) {
        return reportingService.getCustomerDeliveryOverview(customerId);
    }

    @Transactional
    public MonthlyDeliveryCustomersDto getCustomersWithDeliveriesInMonth(String monthValue) {
        return reportingService.getCustomersWithDeliveriesInMonth(monthValue);
    }

    @Transactional
    public List<DeliveryDetailDto> getAssignedDeliveries(String restockerName, String authorizationHeader) {
        validateRestockerName(restockerName);
        ensurePlanningHorizon(authorizationHeader);

        return detailAssembler.toDetailDtos(
                Delivery.findAssignedToRestockerFrom(restockerName, LocalDate.now()),
                authorizationHeader
        );
    }

    @Transactional
    public List<DeliveryDetailDto> replanCustomerDeliveries(String customerId, String authorizationHeader) {
        String normalizedCustomerId = normalizeRequiredCustomerId(customerId);
        lockPlanningHorizon();

        LocalDate today = LocalDate.now();
        LocalDate horizonEnd = today.plusDays(PLANNING_HORIZON_DAYS);
        deleteFutureFreeDeliveries(normalizedCustomerId, today, horizonEnd);

        List<OrderDto> customerOrders = activeOrdersForCustomer(
                normalizedCustomerId,
                orderClient.getActiveOrders(authorizationHeader)
        );
        planDeliveries(customerOrders, today, horizonEnd, authorizationHeader);

        return detailAssembler.toDetailDtos(Delivery.findByCustomer(normalizedCustomerId), authorizationHeader);
    }

    @Transactional
    public DeliveryDetailDto acceptDelivery(UUID deliveryId, String restockerName, String authorizationHeader) {
        return detailAssembler.toDetailDtoWithFreshData(tourService.acceptDelivery(deliveryId, restockerName), authorizationHeader);
    }

    @Transactional
    public Tour syncTodayOrders(String restockerName, String authorizationHeader) {
        validateRestockerName(restockerName);
        ensurePlanningHorizon(authorizationHeader);
        return findTodayOpenTour(restockerName);
    }

    @Transactional
    public Delivery collectPackage(UUID deliveryId) {
        return tourService.collectPackage(deliveryId);
    }

    @Transactional
    public DeliveryItem markItemDelivered(UUID itemId) {
        return tourService.markItemDelivered(itemId);
    }

    @Transactional
    public Delivery confirmDelivery(UUID deliveryId) {
        return tourService.confirmDelivery(deliveryId);
    }

    @Transactional
    public DeliveryDetailDto getDeliveryDetail(UUID deliveryId, String authorizationHeader) {
        Delivery delivery = findDeliveryOrThrow(deliveryId);
        return detailAssembler.toDetailDtoWithFreshData(delivery, authorizationHeader);
    }

    @Transactional
    public List<DeliveryDetailDto> getTourDeliveryDetails(UUID tourId, String authorizationHeader) {
        return detailAssembler.toDetailDtos(Delivery.findByTour(tourId), authorizationHeader);
    }

    private void ensurePlanningHorizon(String authorizationHeader) {
        lockPlanningHorizon();

        LocalDate today = LocalDate.now();
        LocalDate horizonEnd = today.plusDays(PLANNING_HORIZON_DAYS);
        List<OrderDto> activeOrders = orderClient.getActiveOrders(authorizationHeader);
        if (activeOrders == null || activeOrders.isEmpty()) {
            return;
        }

        planDeliveries(activeOrders, today, horizonEnd, authorizationHeader);
    }

    private void planDeliveries(
            List<OrderDto> activeOrders,
            LocalDate today,
            LocalDate horizonEnd,
            String authorizationHeader
    ) {
        Map<String, UserDto> customerCache = new HashMap<>();
        Map<String, List<Delivery>> customerDeliveriesCache = new HashMap<>();
        Map<DeliveryGroupKey, DeliveryGroup> groupedOrders = new LinkedHashMap<>();

        for (OrderDto order : activeOrders) {
            if (!isPlannableOrder(order)) {
                continue;
            }

            UserDto user = loadCachedUser(order.getCustomerId(), customerCache, authorizationHeader);
            List<Delivery> customerDeliveries = existingDeliveriesForCustomer(order.getCustomerId(), customerDeliveriesCache);
            List<LocalDate> existingOrderDeliveryDates = existingDeliveryDatesForOrder(order, customerDeliveries);
            List<LocalDate> existingCustomerDeliveryDates = existingCustomerDeliveryDates(customerDeliveries, today, horizonEnd);
            for (LocalDate deliveryDate : calculateDueDates(
                    order,
                    user,
                    today,
                    horizonEnd,
                    existingOrderDeliveryDates,
                    existingCustomerDeliveryDates
            )) {
                DeliveryGroupKey groupKey = new DeliveryGroupKey(order.getCustomerId(), deliveryDate);
                DeliveryGroup group = groupedOrders.computeIfAbsent(groupKey, ignored -> new DeliveryGroup());
                group.orders.add(new PlannedOrder(order, existingOrderDeliveryDates.isEmpty()));
            }
        }

        for (Map.Entry<DeliveryGroupKey, DeliveryGroup> entry : groupedOrders.entrySet()) {
            upsertPlannedDelivery(entry.getKey(), entry.getValue().orders, today);
        }
    }

    private List<OrderDto> activeOrdersForCustomer(String customerId, List<OrderDto> activeOrders) {
        if (activeOrders == null || activeOrders.isEmpty()) {
            return List.of();
        }

        return activeOrders.stream()
                .filter(this::isPlannableOrder)
                .filter(order -> customerId.equals(order.getCustomerId()))
                .collect(Collectors.toList());
    }

    private void deleteFutureFreeDeliveries(String customerId, LocalDate today, LocalDate horizonEnd) {
        List<Delivery> replannableDeliveries = Delivery.findFutureUnassignedByCustomerBetween(
                customerId,
                today,
                horizonEnd
        );

        for (Delivery delivery : replannableDeliveries) {
            if (canReplanDelivery(delivery, today)) {
                entityManager.remove(entityManager.contains(delivery) ? delivery : entityManager.merge(delivery));
            }
        }
    }

    boolean canReplanDelivery(Delivery delivery, LocalDate today) {
        return delivery != null
                && delivery.deliveryDate != null
                && delivery.deliveryDate.isAfter(today)
                && delivery.tour == null
                && delivery.acceptedAt == null
                && delivery.deliveredAt == null;
    }

    private void lockPlanningHorizon() {
        entityManager
                .createNativeQuery("select pg_advisory_xact_lock(7744288937001)")
                .getSingleResult();
    }

    private void upsertPlannedDelivery(DeliveryGroupKey groupKey, List<PlannedOrder> plannedOrders, LocalDate today) {
        Delivery delivery = Delivery.findByCustomerAndDate(groupKey.customerId(), groupKey.deliveryDate());

        if (delivery == null) {
            List<OrderDto> orders = plannedOrders.stream()
                    .map(PlannedOrder::order)
                    .collect(Collectors.toList());
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

        List<OrderDto> newOrders = plannedOrders.stream()
                .filter(PlannedOrder::newArticle)
                .map(PlannedOrder::order)
                .collect(Collectors.toList());
        if (newOrders.isEmpty()) {
            return;
        }

        if (!canAppendToExistingDelivery(delivery, groupKey.deliveryDate(), today)) {
            return;
        }

        appendNewOrdersToDelivery(delivery, newOrders);
    }

    boolean canAppendToExistingDelivery(Delivery delivery, LocalDate deliveryDate, LocalDate today) {
        return delivery != null
                && !delivery.isDelivered()
                && deliveryDate != null
                && deliveryDate.isAfter(today);
    }

    List<LocalDate> calculateDueDates(
            OrderDto order,
            UserDto user,
            LocalDate startDate,
            LocalDate endDate,
            List<LocalDate> existingOrderDeliveryDates,
            List<LocalDate> existingCustomerDeliveryDates
    ) {
        List<LocalDate> dueDates = new ArrayList<>();
        DayOfWeek deliveryDay = resolveDeliveryDay(user, order);
        int intervalWeeks = order.getInterval() != null && order.getInterval() > 0 ? order.getInterval() : 1;
        if (deliveryDay == null) {
            LOG.errorf(
                    "Überspringe Lieferplanung für Order %s / Kunde %s, da kein gültiger Liefertag verfügbar ist.",
                    order.getId(),
                    order.getCustomerId()
            );
            return dueDates;
        }

        if ((existingOrderDeliveryDates == null || existingOrderDeliveryDates.isEmpty())
                && existingCustomerDeliveryDates != null
                && !existingCustomerDeliveryDates.isEmpty()) {
            return existingCustomerDueDatesForNewOrder(
                    order,
                    intervalWeeks,
                    startDate,
                    endDate,
                    existingCustomerDeliveryDates
            );
        }

        LocalDate deliveryDate = firstPlannableDeliveryDate(
                order,
                deliveryDay,
                intervalWeeks,
                startDate,
                existingOrderDeliveryDates
        );
        while (deliveryDate.isBefore(startDate)) {
            deliveryDate = nextDeliveryDate(deliveryDate, deliveryDay, intervalWeeks);
        }

        while (!deliveryDate.isAfter(endDate)) {
            dueDates.add(deliveryDate);
            deliveryDate = nextDeliveryDate(deliveryDate, deliveryDay, intervalWeeks);
        }

        return dueDates;
    }

    private List<LocalDate> existingCustomerDueDatesForNewOrder(
            OrderDto order,
            int intervalWeeks,
            LocalDate startDate,
            LocalDate endDate,
            List<LocalDate> existingCustomerDeliveryDates
    ) {
        if (existingCustomerDeliveryDates == null || existingCustomerDeliveryDates.isEmpty()) {
            return List.of();
        }

        LocalDate anchorDate = order.getCreatedAt() != null ? order.getCreatedAt().toLocalDate() : startDate;
        LocalDate firstEligibleDate = existingCustomerDeliveryDates.stream()
                .filter(date -> !date.isBefore(startDate))
                .filter(date -> !date.isAfter(endDate))
                .filter(date -> completeWorkdaysBetween(anchorDate, date) >= 2)
                .findFirst()
                .orElse(null);
        if (firstEligibleDate == null) {
            return List.of();
        }

        return existingCustomerDeliveryDates.stream()
                .filter(date -> !date.isBefore(firstEligibleDate))
                .filter(date -> !date.isAfter(endDate))
                .filter(date -> weeksBetween(firstEligibleDate, date) % intervalWeeks == 0)
                .collect(Collectors.toList());
    }

    private long weeksBetween(LocalDate startDate, LocalDate endDate) {
        return java.time.temporal.ChronoUnit.WEEKS.between(startDate, endDate);
    }

    private LocalDate firstPlannableDeliveryDate(
            OrderDto order,
            DayOfWeek deliveryDay,
            int intervalWeeks,
            LocalDate startDate,
            List<LocalDate> existingDeliveryDates
    ) {
        LocalDate latestExistingDeliveryDate = latestDate(existingDeliveryDates);
        if (latestExistingDeliveryDate != null) {
            return nextDeliveryDate(latestExistingDeliveryDate, deliveryDay, intervalWeeks);
        }

        LocalDate anchorDate = order.getCreatedAt() != null ? order.getCreatedAt().toLocalDate() : startDate;
        return firstDateWithMinimumLeadTime(anchorDate, deliveryDay);
    }

    private LocalDate nextDeliveryDate(LocalDate previousDeliveryDate, DayOfWeek deliveryDay, int intervalWeeks) {
        LocalDate intervalAnchor = previousDeliveryDate.plusWeeks(intervalWeeks);
        return dateInSameWeek(intervalAnchor, deliveryDay);
    }

    private LocalDate dateInSameWeek(LocalDate date, DayOfWeek deliveryDay) {
        int dayDifference = deliveryDay.getValue() - date.getDayOfWeek().getValue();
        return date.plusDays(dayDifference);
    }

    private DayOfWeek resolveDeliveryDay(UserDto user, OrderDto order) {
        DayOfWeek configuredDeliveryDay = parseDeliveryDay(user != null ? user.getDeliveryDay() : null);
        if (configuredDeliveryDay != null) {
            return configuredDeliveryDay;
        }

        return null;
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

    private LocalDate firstDateWithMinimumLeadTime(LocalDate anchorDate, DayOfWeek deliveryDay) {
        LocalDate deliveryDate = firstDateOnOrAfter(anchorDate, deliveryDay);
        while (completeWorkdaysBetween(anchorDate, deliveryDate) < 2) {
            deliveryDate = deliveryDate.plusWeeks(1);
        }

        return deliveryDate;
    }

    private int completeWorkdaysBetween(LocalDate startDate, LocalDate endDate) {
        int workdays = 0;
        LocalDate date = startDate.plusDays(1);
        while (date.isBefore(endDate)) {
            if (isWorkday(date)) {
                workdays++;
            }
            date = date.plusDays(1);
        }

        return workdays;
    }

    private boolean isWorkday(LocalDate date) {
        return date.getDayOfWeek() != DayOfWeek.SATURDAY
                && date.getDayOfWeek() != DayOfWeek.SUNDAY;
    }

    private List<Delivery> existingDeliveriesForCustomer(
            String customerId,
            Map<String, List<Delivery>> customerDeliveriesCache
    ) {
        return customerDeliveriesCache.computeIfAbsent(customerId, Delivery::findByCustomer);
    }

    private List<LocalDate> existingDeliveryDatesForOrder(OrderDto order, List<Delivery> customerDeliveries) {
        String orderId = order.getId().toString();

        return customerDeliveries.stream()
                .filter(delivery -> splitOrderIds(delivery.orderId).contains(orderId))
                .map(delivery -> delivery.deliveryDate)
                .filter(Objects::nonNull)
                .sorted()
                .collect(Collectors.toList());
    }

    private List<LocalDate> existingCustomerDeliveryDates(
            List<Delivery> customerDeliveries,
            LocalDate startDate,
            LocalDate endDate
    ) {
        return customerDeliveries.stream()
                .map(delivery -> delivery.deliveryDate)
                .filter(Objects::nonNull)
                .filter(date -> !date.isBefore(startDate))
                .filter(date -> !date.isAfter(endDate))
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    private LocalDate latestDate(List<LocalDate> dates) {
        if (dates == null || dates.isEmpty()) {
            return null;
        }

        return dates.stream().max(LocalDate::compareTo).orElse(null);
    }

    List<DeliveredArticleSummaryDto> summarizeDeliveredItemsForPeriod(
            List<Delivery> deliveries,
            LocalDate periodStart,
            LocalDate periodEnd
    ) {
        return DeliveryReportingService.summarizeDeliveredItemsForPeriod(deliveries, periodStart, periodEnd);
    }

    CustomerDeliveryOverviewDto toCustomerDeliveryOverview(List<Delivery> deliveries, LocalDate today) {
        return DeliveryReportingService.toCustomerDeliveryOverview(deliveries, today);
    }

    List<String> customerIdsWithDeliveredAtInPeriod(
            List<Delivery> deliveries,
            LocalDateTime periodStart,
            LocalDateTime periodEndExclusive
    ) {
        return DeliveryReportingService.customerIdsWithDeliveredAtInPeriod(
                deliveries,
                periodStart,
                periodEndExclusive
        );
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

    private boolean isPlannableOrder(OrderDto order) {
        return isActiveOrder(order)
                && order.getId() != null
                && order.getCustomerId() != null
                && !order.getCustomerId().isBlank()
                && order.getProductId() != null
                && !order.getProductId().isBlank();
    }

    private boolean isActiveOrder(OrderDto order) {
        return order != null && (order.getStatus() == null || "ACTIVE".equalsIgnoreCase(order.getStatus()));
    }

    private void validateRestockerName(String restockerName) {
        if (restockerName == null || restockerName.isBlank()) {
            throw new BadRequestException("Restocker fehlt.");
        }
    }

    private String normalizeRequiredCustomerId(String customerId) {
        if (customerId == null || customerId.isBlank()) {
            throw new BadRequestException("customerId muss angegeben werden.");
        }

        return customerId.trim();
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
            try {
                return userClient.getCustomerProfile(userId, authorizationHeader);
            } catch (RuntimeException fallbackException) {
                LOG.errorf(
                        fallbackException,
                        "Could not load customer profile for delivery planning: %s",
                        userId
                );
                return null;
            }
        }
    }

    private DeliveryItem createDeliveryItem(OrderDto order) {
        DeliveryItem item = new DeliveryItem();
        ArticleDto article = tryLoadArticle(order.getProductId());
        item.articleNumber = order.getProductId();
        item.name = valueOrFallback(
                article != null ? article.getName() : null,
                fallbackArticleName(order.getProductId())
        );
        item.unit = valueOrFallback(
                article != null ? article.getUnit() : null,
                DEFAULT_UNIT
        );
        item.quantity = order.getQuantity() != null && order.getQuantity() > 0 ? order.getQuantity() : 1;
        return item;
    }

    YearMonth parseDeliveryMonth(String monthValue) {
        return DeliveryReportingService.parseDeliveryMonth(monthValue);
    }

    void appendNewOrdersToDelivery(Delivery delivery, List<OrderDto> orders) {
        List<String> existingOrderIds = splitOrderIds(delivery.orderId);

        for (OrderDto order : orders) {
            String orderId = order.getId().toString();
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
                .map(order -> order.getId().toString())
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

    private ArticleDto tryLoadArticle(String articleNumber) {
        try {
            return articleClient.getArticleByProductId(articleNumber);
        } catch (RuntimeException exception) {
            return null;
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String valueOrFallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String fallbackArticleName(String articleNumber) {
        return "Artikel " + articleNumber;
    }

    private record DeliveryGroupKey(String customerId, LocalDate deliveryDate) {
    }

    private record PlannedOrder(OrderDto order, boolean newArticle) {
    }

    private static class DeliveryGroup {
        final List<PlannedOrder> orders = new ArrayList<>();
    }
}
