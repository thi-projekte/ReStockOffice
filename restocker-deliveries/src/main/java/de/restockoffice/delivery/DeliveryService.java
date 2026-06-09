package de.restockoffice.delivery;

import de.restockoffice.article.ArticleClient;
import de.restockoffice.article.ArticleDto;
import de.restockoffice.order.OrderClient;
import de.restockoffice.order.OrderDto;
import de.restockoffice.user.UserClient;
import de.restockoffice.user.UserDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class DeliveryService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    static final int PLANNING_HORIZON_DAYS = 14;
    private static final String TEST_ORDER_PREFIX = "test-delivery-";
    private static final String DEFAULT_TEST_CUSTOMER_ONE = "3e6572a7-3852-42e3-81eb-17e7f9622kk8";
    private static final String DEFAULT_TEST_CUSTOMER_TWO = "c831fce5-56a3-443e-a27f-cc769a1ed0d7";
    private static final String DEFAULT_UNIT = "Stück";
    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter
            .ofPattern("MM.uuuu")
            .withResolverStyle(ResolverStyle.STRICT);

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
            String recipientEmail,
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
                normalizeOptionalRecipientEmail(recipientEmail),
                deliveryDate,
                List.of(
                        createTestDeliveryItem("10086", "Kassenbuch A4", 1, DEFAULT_UNIT),
                        createTestDeliveryItem("10003", "Textmarker-Set (4 Farben)", 1, DEFAULT_UNIT)
                )
        );
        Delivery secondDelivery = createOpenTestDelivery(
                TEST_ORDER_PREFIX + "two",
                normalizeOptionalCustomerId(secondCustomerId, DEFAULT_TEST_CUSTOMER_TWO),
                normalizeOptionalRecipientEmail(recipientEmail),
                deliveryDate,
                List.of(
                        createTestDeliveryItem("10088", "Gummizugmappe A3", 1, DEFAULT_UNIT),
                        createTestDeliveryItem("10007", "Klarsichthuellen A4 oben offen", 10, DEFAULT_UNIT)
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
    public List<DeliveryDetailDto> getAllDeliveries(String authorizationHeader) {
        return toDetailDtos(Delivery.list("order by deliveryDate desc, userId asc"), authorizationHeader);
    }

    @Transactional
    public List<DeliveredArticleSummaryDto> getDeliveredArticleSummaryForPreviousMonth(String customerId) {
        if (isBlank(customerId)) {
            throw new BadRequestException("customerId muss angegeben werden.");
        }

        LocalDate currentMonthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate previousMonthStart = currentMonthStart.minusMonths(1);
        LocalDate previousMonthEnd = currentMonthStart.minusDays(1);
        List<Delivery> deliveries = Delivery.findDeliveredByCustomerBetween(
                customerId.trim(),
                previousMonthStart,
                previousMonthEnd
        );

        return summarizeDeliveredItemsForPeriod(deliveries, previousMonthStart, previousMonthEnd);
    }

    @Transactional
    public CustomerDeliveryOverviewDto getCustomerDeliveryOverview(String customerId) {
        if (isBlank(customerId)) {
            throw new BadRequestException("customerId muss angegeben werden.");
        }

        List<Delivery> deliveries = Delivery.findByCustomer(customerId.trim());
        return toCustomerDeliveryOverview(deliveries, LocalDate.now());
    }

    @Transactional
    public MonthlyDeliveryCustomersDto getCustomersWithDeliveriesInMonth(String monthValue) {
        String normalizedMonth = normalizeDeliveryMonth(monthValue);
        YearMonth month = parseDeliveryMonth(normalizedMonth);
        LocalDateTime monthStart = month.atDay(1).atStartOfDay();
        LocalDateTime nextMonthStart = month.plusMonths(1).atDay(1).atStartOfDay();

        List<String> customerIds = findCustomerIdsDeliveredBetween(monthStart, nextMonthStart);
        return new MonthlyDeliveryCustomersDto(normalizedMonth, customerIds);
    }

    @Transactional
    public List<DeliveryDetailDto> getAssignedDeliveries(String restockerName, String authorizationHeader) {
        validateRestockerName(restockerName);
        ensurePlanningHorizon(authorizationHeader);

        return toDetailDtos(
                Delivery.findAssignedToRestockerFrom(restockerName, LocalDate.now()),
                authorizationHeader
        );
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

        LocalDate deliveryDate = requireDeliveryDate(delivery);

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
        lockPlanningHorizon();

        LocalDate today = LocalDate.now();
        LocalDate horizonEnd = today.plusDays(PLANNING_HORIZON_DAYS);
        List<OrderDto> activeOrders = orderClient.getActiveOrders(authorizationHeader);
        if (activeOrders == null || activeOrders.isEmpty()) {
            return;
        }

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

        if (order.getCreatedAt() != null) {
            return order.getCreatedAt().getDayOfWeek();
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
        if (deliveries == null || deliveries.isEmpty()) {
            return List.of();
        }

        Map<String, Integer> quantitiesByArticle = new LinkedHashMap<>();
        for (Delivery delivery : deliveries) {
            if (!isDeliveredInPeriod(delivery, periodStart, periodEnd) || delivery.items == null) {
                continue;
            }

            for (DeliveryItem item : delivery.items) {
                if (item == null || isBlank(item.articleNumber)) {
                    continue;
                }

                quantitiesByArticle.merge(item.articleNumber, item.quantity, Integer::sum);
            }
        }

        return quantitiesByArticle.entrySet().stream()
                .map(entry -> new DeliveredArticleSummaryDto(entry.getKey(), entry.getValue()))
                .collect(Collectors.toList());
    }

    CustomerDeliveryOverviewDto toCustomerDeliveryOverview(List<Delivery> deliveries, LocalDate today) {
        Delivery lastDelivery = null;
        Delivery nextDelivery = null;

        if (deliveries != null) {
            List<Delivery> sortedDeliveries = deliveries.stream()
                    .filter(delivery -> delivery != null && delivery.deliveryDate != null)
                    .sorted((left, right) -> left.deliveryDate.compareTo(right.deliveryDate))
                    .collect(Collectors.toList());

            for (Delivery delivery : sortedDeliveries) {
                if (delivery.deliveryDate.isBefore(today)) {
                    lastDelivery = delivery;
                    continue;
                }

                if (nextDelivery == null) {
                    nextDelivery = delivery;
                }
            }
        }

        return new CustomerDeliveryOverviewDto(
                toDeliverySummary(lastDelivery),
                toDeliverySummary(nextDelivery)
        );
    }

    List<String> customerIdsWithDeliveredAtInPeriod(
            List<Delivery> deliveries,
            LocalDateTime periodStart,
            LocalDateTime periodEndExclusive
    ) {
        if (deliveries == null || deliveries.isEmpty()) {
            return List.of();
        }

        return deliveries.stream()
                .filter(Objects::nonNull)
                .filter(delivery -> !isBlank(delivery.userId))
                .filter(delivery -> isDeliveredAtInPeriod(delivery, periodStart, periodEndExclusive))
                .map(delivery -> delivery.userId)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    private DeliverySummaryDto toDeliverySummary(Delivery delivery) {
        if (delivery == null) {
            return null;
        }

        return new DeliverySummaryDto(
                delivery.id,
                requireDeliveryDate(delivery).toString(),
                deliveryStatus(delivery)
        );
    }

    private boolean isDeliveredInPeriod(Delivery delivery, LocalDate periodStart, LocalDate periodEnd) {
        if (delivery == null || !delivery.isDelivered()) {
            return false;
        }

        LocalDate deliveryDate = delivery.deliveryDate;
        return deliveryDate != null
                && !deliveryDate.isBefore(periodStart)
                && !deliveryDate.isAfter(periodEnd);
    }

    private boolean isDeliveredAtInPeriod(
            Delivery delivery,
            LocalDateTime periodStart,
            LocalDateTime periodEndExclusive
    ) {
        LocalDateTime deliveredAt = delivery.deliveredAt;
        return deliveredAt != null
                && !deliveredAt.isBefore(periodStart)
                && deliveredAt.isBefore(periodEndExclusive);
    }

    private List<String> findCustomerIdsDeliveredBetween(LocalDateTime periodStart, LocalDateTime periodEndExclusive) {
        return entityManager
                .createQuery(
                        "select distinct d.userId from Delivery d " +
                                "where d.userId is not null and d.userId <> '' " +
                                "and d.deliveredAt >= :periodStart and d.deliveredAt < :periodEnd " +
                                "order by d.userId asc",
                        String.class
                )
                .setParameter("periodStart", periodStart)
                .setParameter("periodEnd", periodEndExclusive)
                .getResultList();

    }

    private List<DeliveryDetailDto> toDetailDtos(List<Delivery> deliveries, String authorizationHeader) {
        Map<String, UserDto> userCache = new HashMap<>();
        Map<String, ArticleDto> articleCache = new HashMap<>();
        AuthenticatedRestocker authenticatedRestocker = authenticatedRestocker(authorizationHeader);

        return deliveries.stream()
                .map(delivery -> {
                    UserDto user = loadCachedUser(delivery.userId, userCache, authorizationHeader);
                    return toDetailDto(delivery, user, articleCache, authenticatedRestocker);
                })
                .collect(Collectors.toList());
    }

    private DeliveryDetailDto toDetailDtoWithFreshData(Delivery delivery, String authorizationHeader) {
        UserDto user = tryLoadUser(delivery.userId, authorizationHeader);
        return toDetailDto(delivery, user, new HashMap<>(), authenticatedRestocker(authorizationHeader));
    }

    private DeliveryDetailDto toDetailDto(
            Delivery delivery,
            UserDto user,
            Map<String, ArticleDto> articleCache,
            AuthenticatedRestocker authenticatedRestocker
    ) {
        DeliveryDetailDto dto = new DeliveryDetailDto();
        dto.setId(delivery.id);
        dto.setOrderId(delivery.orderId);
        dto.setUserId(delivery.userId);
        dto.setStopOrder(delivery.stopOrder);
        dto.setCollected(delivery.collected);
        dto.setCollectedAt(delivery.collectedAt);
        dto.setAcceptedAt(delivery.acceptedAt);
        dto.setDeliveredAt(delivery.deliveredAt);
        dto.setRestockerName(restockerDisplayName(delivery, authenticatedRestocker));
        dto.setStatus(deliveryStatus(delivery));

        dto.setRecipientEmail(valueOrEmpty(valueOrFallback(delivery.recipientEmail, user != null ? user.getEmail() : null)));
        dto.setCompanyName(valueOrEmpty(user != null ? user.getCompanyName() : null));
        dto.setStreet(valueOrEmpty(user != null ? user.getStreet() : null));
        dto.setHouseNumber(valueOrEmpty(user != null ? user.getHouseNumber() : null));
        dto.setPostalCode(valueOrEmpty(user != null ? user.getPostalCode() : null));
        dto.setCity(valueOrEmpty(user != null ? user.getCity() : null));
        dto.setCountry(valueOrEmpty(user != null ? user.getCountry() : null));
        dto.setPhoneNumber(valueOrEmpty(user != null ? user.getPhoneNumber() : null));
        dto.setContactPerson(valueOrEmpty(user != null ? user.getRoleInCompany() : null));
        dto.setDeliveryHint(valueOrEmpty(user != null ? user.getDeliveryHint() : null));
        dto.setDeliveryDay(valueOrEmpty(user != null ? user.getDeliveryDay() : null));
        dto.setDeliveryTime(valueOrEmpty(user != null ? user.getDeliveryTime() : null));
        dto.setDeliveryDate(requireDeliveryDate(delivery).toString());
        dto.setItems(toDetailItems(delivery, articleCache));

        return dto;
    }

    private List<DeliveryDetailDto.DeliveryItemDetailDto> toDetailItems(
            Delivery delivery,
            Map<String, ArticleDto> articleCache
    ) {
        return delivery.items.stream()
                .map(item -> toDetailItem(item, articleCache))
                .collect(Collectors.toList());
    }

    private DeliveryDetailDto.DeliveryItemDetailDto toDetailItem(
            DeliveryItem item,
            Map<String, ArticleDto> articleCache
    ) {
        DeliveryDetailDto.DeliveryItemDetailDto detailItem = new DeliveryDetailDto.DeliveryItemDetailDto();
        ArticleDto article = loadArticle(item.articleNumber, articleCache);
        detailItem.setId(item.id);
        detailItem.setArticleNumber(item.articleNumber);
        detailItem.setDelivered(item.delivered);
        detailItem.setName(valueOrFallback(
                item.name,
                article != null ? article.getName() : fallbackArticleName(item.articleNumber)
        ));
        detailItem.setQuantity(item.quantity);
        detailItem.setUnit(valueOrFallback(
                item.unit,
                article != null ? article.getUnit() : DEFAULT_UNIT
        ));
        return detailItem;
    }

    private String deliveryStatus(Delivery delivery) {
        if (delivery.deliveredAt != null) {
            return "DELIVERED";
        }

        if (delivery.collected) {
            return "COLLECTED";
        }

        if (delivery.tour != null || delivery.acceptedAt != null) {
            return "ACCEPTED";
        }

        return "OPEN";
    }

    private String restockerDisplayName(Delivery delivery, AuthenticatedRestocker authenticatedRestocker) {
        if (delivery.tour == null || isBlank(delivery.tour.restockerName)) {
            return null;
        }

        if (authenticatedRestocker != null
                && delivery.tour.restockerName.equals(authenticatedRestocker.username())
                && !isBlank(authenticatedRestocker.displayName())) {
            return authenticatedRestocker.displayName();
        }

        return delivery.tour.restockerName;
    }

    private AuthenticatedRestocker authenticatedRestocker(String authorizationHeader) {
        String token = bearerToken(authorizationHeader);
        if (isBlank(token)) {
            return null;
        }

        String[] parts = token.split("\\.");
        if (parts.length < 2) {
            return null;
        }

        try {
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), java.nio.charset.StandardCharsets.UTF_8);
            JsonNode claims = OBJECT_MAPPER.readTree(payload);
            String username = firstNonBlank(textClaim(claims, "preferred_username"), textClaim(claims, "sub"));
            String displayName = firstNonBlank(
                    joinName(textClaim(claims, "given_name"), textClaim(claims, "family_name")),
                    textClaim(claims, "name")
            );
            return new AuthenticatedRestocker(username, displayName);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String bearerToken(String authorizationHeader) {
        if (isBlank(authorizationHeader) || !authorizationHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return null;
        }
        return authorizationHeader.substring(7).trim();
    }

    private String textClaim(JsonNode claims, String claimName) {
        JsonNode claim = claims != null ? claims.get(claimName) : null;
        return claim != null && claim.isTextual() ? claim.asText() : null;
    }

    private String joinName(String firstName, String lastName) {
        return firstNonBlank(
                (valueOrEmpty(firstName) + " " + valueOrEmpty(lastName)).trim(),
                null
        );
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

    private LocalDate requireDeliveryDate(Delivery delivery) {
        if (delivery.deliveryDate != null) {
            return delivery.deliveryDate;
        }

        throw new IllegalStateException("Delivery hat kein deliveryDate: " + delivery.id);
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
            user.setUserId(userId);
            user.setEmail("corinna.niedermeier01@gmail.com");
            user.setCompanyName("Muster GmbH");
            user.setStreet("Teststrasse");
            user.setHouseNumber("12");
            user.setPostalCode("85049");
            user.setCity("Ingolstadt");
            user.setCountry("Deutschland");
            user.setPhoneNumber("+49 841 123456");
            user.setRoleInCompany("Warenannahme");
            user.setDeliveryHint("Bitte am Empfang melden.");
            user.setDeliveryDay("Samstag");
            user.setDeliveryTime("10:00");
            return user;
        }

        if (DEFAULT_TEST_CUSTOMER_TWO.equals(userId)) {
            UserDto user = new UserDto();
            user.setUserId(userId);
            user.setEmail("corinna.niedermeier01@gmail.com");
            user.setCompanyName("Beispiel Office AG");
            user.setStreet("Demoweg");
            user.setHouseNumber("7");
            user.setPostalCode("90402");
            user.setCity("Nürnberg");
            user.setCountry("Deutschland");
            user.setPhoneNumber("+49 911 987654");
            user.setRoleInCompany("Office Management");
            user.setDeliveryHint("Anlieferung über Seiteneingang.");
            user.setDeliveryDay("Samstag");
            user.setDeliveryTime("14:00");
            return user;
        }

        return null;
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

    private Delivery createOpenTestDelivery(
            String orderId,
            String customerId,
            String recipientEmail,
            LocalDate deliveryDate,
            List<DeliveryItem> items
    ) {
        Delivery delivery = new Delivery();
        delivery.orderId = orderId;
        delivery.userId = customerId;
        delivery.recipientEmail = recipientEmail;
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

    private String normalizeOptionalRecipientEmail(String recipientEmail) {
        return recipientEmail != null && !recipientEmail.isBlank() ? recipientEmail.trim() : null;
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

    YearMonth parseDeliveryMonth(String monthValue) {
        try {
            return YearMonth.parse(monthValue, MONTH_FORMATTER);
        } catch (DateTimeParseException exception) {
            throw new BadRequestException("month muss im Format MM.YYYY angegeben werden, z. B. 06.2026.");
        }
    }

    private String normalizeDeliveryMonth(String monthValue) {
        if (isBlank(monthValue)) {
            throw new BadRequestException("month muss angegeben werden.");
        }

        return monthValue.trim();
    }

    private String normalizeOptionalCustomerId(String customerId, String fallbackCustomerId) {
        return customerId == null || customerId.isBlank()
                ? fallbackCustomerId
                : customerId.trim();
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

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }

        for (String value : values) {
            if (!isBlank(value)) {
                return value;
            }
        }

        return null;
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

    private record AuthenticatedRestocker(String username, String displayName) {
    }

    private static class DeliveryGroup {
        final List<PlannedOrder> orders = new ArrayList<>();
    }
}
