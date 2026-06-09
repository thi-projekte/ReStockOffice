package de.restockoffice.delivery;

import de.restockoffice.order.OrderDto;
import de.restockoffice.user.UserDto;
import org.junit.jupiter.api.Test;

import jakarta.ws.rs.BadRequestException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertIterableEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DeliveryServiceTest {

    private static final String CUSTOMER_ID = "customer-1";
    private static final String DELIVERY_DAY_TUESDAY = "Dienstag";
    private static final String DELIVERY_DAY_THURSDAY = "Donnerstag";
    private static final String MONTHLY_DELIVERED_CUSTOMER_ID = "customer-b";
    private static final String ARTICLE_NUMBER_10001 = "10001";
    private static final String ARTICLE_NUMBER_10002 = "10002";
    private static final String ARTICLE_NUMBER_10007 = "10007";
    private static final String ARTICLE_NUMBER_10088 = "10088";

    private final DeliveryService service = new DeliveryService();

    @Test
    void planningHorizonIsFourteenDays() {
        assertEquals(14, DeliveryService.PLANNING_HORIZON_DAYS);
    }

    @Test
    void deliveryDayChangeKeepsFourWeekIntervalAnchorFromExistingDeliveries() {
        OrderDto order = order(1L, CUSTOMER_ID, ARTICLE_NUMBER_10001, 1, 4, LocalDate.of(2026, 5, 1));
        UserDto user = user(DELIVERY_DAY_THURSDAY);

        List<LocalDate> currentHorizonDates = service.calculateDueDates(
                order,
                user,
                LocalDate.of(2026, 5, 27),
                LocalDate.of(2026, 6, 10),
                List.of(LocalDate.of(2026, 6, 2)),
                List.of(LocalDate.of(2026, 6, 2))
        );
        assertIterableEquals(List.of(), currentHorizonDates);

        List<LocalDate> extendedDates = service.calculateDueDates(
                order,
                user,
                LocalDate.of(2026, 5, 27),
                LocalDate.of(2026, 7, 10),
                List.of(LocalDate.of(2026, 6, 2)),
                List.of(LocalDate.of(2026, 6, 2))
        );
        assertIterableEquals(List.of(LocalDate.of(2026, 7, 2)), extendedDates);
    }

    @Test
    void deliveryDayChangeDoesNotCreateAReplacementInsideExistingHorizon() {
        OrderDto order = order(1L, CUSTOMER_ID, ARTICLE_NUMBER_10001, 1, 1, LocalDate.of(2026, 5, 1));
        UserDto user = user(DELIVERY_DAY_THURSDAY);

        List<LocalDate> dueDates = service.calculateDueDates(
                order,
                user,
                LocalDate.of(2026, 5, 27),
                LocalDate.of(2026, 6, 10),
                List.of(LocalDate.of(2026, 6, 2), LocalDate.of(2026, 6, 9)),
                List.of(LocalDate.of(2026, 6, 2), LocalDate.of(2026, 6, 9))
        );

        assertIterableEquals(List.of(), dueDates);
    }

    @Test
    void newOrdersStillHonorTwoCompleteWorkdaysLeadTime() {
        OrderDto order = order(1L, CUSTOMER_ID, ARTICLE_NUMBER_10001, 1, 1, LocalDate.of(2026, 6, 5));
        UserDto user = user(DELIVERY_DAY_TUESDAY);

        List<LocalDate> dueDates = service.calculateDueDates(
                order,
                user,
                LocalDate.of(2026, 6, 5),
                LocalDate.of(2026, 6, 18),
                List.of(),
                List.of()
        );

        assertIterableEquals(List.of(LocalDate.of(2026, 6, 16)), dueDates);
    }

    @Test
    void newOrderUsesExistingCustomerDeliveriesInsideCurrentHorizon() {
        OrderDto order = order(2L, CUSTOMER_ID, ARTICLE_NUMBER_10002, 1, 1, LocalDate.of(2026, 6, 4));
        UserDto user = user(DELIVERY_DAY_THURSDAY);

        List<LocalDate> dueDates = service.calculateDueDates(
                order,
                user,
                LocalDate.of(2026, 6, 4),
                LocalDate.of(2026, 6, 18),
                List.of(),
                List.of(LocalDate.of(2026, 6, 9))
        );

        assertIterableEquals(List.of(LocalDate.of(2026, 6, 9)), dueDates);
    }

    @Test
    void newOrderDoesNotCreateReplacementDateInsideExistingCustomerHorizon() {
        OrderDto order = order(2L, CUSTOMER_ID, ARTICLE_NUMBER_10002, 1, 1, LocalDate.of(2026, 6, 8));
        UserDto user = user(DELIVERY_DAY_THURSDAY);

        List<LocalDate> dueDates = service.calculateDueDates(
                order,
                user,
                LocalDate.of(2026, 6, 8),
                LocalDate.of(2026, 6, 12),
                List.of(),
                List.of(LocalDate.of(2026, 6, 9))
        );

        assertIterableEquals(List.of(), dueDates);
    }

    @Test
    void existingDeliveryItemsAreNotUpdatedWhenOrderChanges() {
        Delivery delivery = deliveryWithExistingItem();
        OrderDto changedOrder = order(1L, CUSTOMER_ID, ARTICLE_NUMBER_10001, 99, 1, LocalDate.of(2026, 5, 1));

        service.appendNewOrdersToDelivery(delivery, List.of(changedOrder));

        assertEquals("1", delivery.orderId);
        assertEquals(1, delivery.items.size());
        assertEquals(1, delivery.items.getFirst().quantity);
    }

    @Test
    void newOrdersAreAppendedToExistingFutureDeliveries() {
        Delivery delivery = deliveryWithExistingItem();
        OrderDto existingOrder = order(1L, CUSTOMER_ID, ARTICLE_NUMBER_10001, 99, 1, LocalDate.of(2026, 5, 1));
        OrderDto newOrder = order(2L, CUSTOMER_ID, ARTICLE_NUMBER_10002, 3, 1, LocalDate.of(2026, 5, 1));

        service.appendNewOrdersToDelivery(delivery, List.of(existingOrder, newOrder));

        assertEquals("1,2", delivery.orderId);
        assertEquals(2, delivery.items.size());
        assertEquals(ARTICLE_NUMBER_10002, delivery.items.get(1).articleNumber);
        assertEquals(3, delivery.items.get(1).quantity);
    }

    @Test
    void deliveredDeliveriesAreNeverExtended() {
        Delivery delivery = deliveryWithExistingItem();
        delivery.deliveredAt = LocalDateTime.of(2026, 6, 10, 14, 0);

        boolean canAppend = service.canAppendToExistingDelivery(
                delivery,
                LocalDate.of(2026, 6, 9),
                LocalDate.of(2026, 6, 1)
        );

        assertFalse(canAppend);
    }

    @Test
    void summarizesDeliveredArticlesForPreviousMonthOnly() {
        Delivery firstDeliveredInPreviousMonth = deliveredDelivery(
                CUSTOMER_ID,
                LocalDate.of(2026, 4, 3),
                item(ARTICLE_NUMBER_10088, 1),
                item(ARTICLE_NUMBER_10007, 5)
        );
        Delivery secondDeliveredInPreviousMonth = deliveredDelivery(
                CUSTOMER_ID,
                LocalDate.of(2026, 4, 28),
                item(ARTICLE_NUMBER_10088, 2),
                item(ARTICLE_NUMBER_10007, 15)
        );
        Delivery deliveredInOtherMonth = deliveredDelivery(
                CUSTOMER_ID,
                LocalDate.of(2026, 3, 31),
                item(ARTICLE_NUMBER_10088, 100)
        );
        Delivery openInPreviousMonth = openDelivery(
                CUSTOMER_ID,
                LocalDate.of(2026, 4, 15),
                item(ARTICLE_NUMBER_10088, 50)
        );

        List<DeliveredArticleSummaryDto> summary = service.summarizeDeliveredItemsForPeriod(
                List.of(
                        firstDeliveredInPreviousMonth,
                        secondDeliveredInPreviousMonth,
                        deliveredInOtherMonth,
                        openInPreviousMonth
                ),
                LocalDate.of(2026, 4, 1),
                LocalDate.of(2026, 4, 30)
        );

        assertEquals(2, summary.size());
        assertEquals(ARTICLE_NUMBER_10088, summary.get(0).getArticleNumber());
        assertEquals(3, summary.get(0).getQuantity());
        assertEquals(ARTICLE_NUMBER_10007, summary.get(1).getArticleNumber());
        assertEquals(20, summary.get(1).getQuantity());
    }

    @Test
    void customerDeliveryOverviewReturnsPreviousAndNextDelivery() {
        Delivery previous = deliveredDelivery(CUSTOMER_ID, LocalDate.of(2026, 5, 20), item(ARTICLE_NUMBER_10001, 1));
        Delivery older = deliveredDelivery(CUSTOMER_ID, LocalDate.of(2026, 5, 1), item(ARTICLE_NUMBER_10002, 1));
        Delivery today = openDelivery(CUSTOMER_ID, LocalDate.of(2026, 5, 27), item("10003", 1));
        Delivery future = openDelivery(CUSTOMER_ID, LocalDate.of(2026, 6, 2), item("10004", 1));
        older.id = UUID.fromString("00000000-0000-0000-0000-000000000001");
        previous.id = UUID.fromString("00000000-0000-0000-0000-000000000002");
        today.id = UUID.fromString("00000000-0000-0000-0000-000000000003");
        future.id = UUID.fromString("00000000-0000-0000-0000-000000000004");

        CustomerDeliveryOverviewDto overview = service.toCustomerDeliveryOverview(
                List.of(today, future, older, previous),
                LocalDate.of(2026, 5, 27)
        );

        assertEquals(previous.id, overview.getLastDelivery().getId());
        assertEquals("2026-05-20", overview.getLastDelivery().getDeliveryDate());
        assertEquals("DELIVERED", overview.getLastDelivery().getStatus());
        assertEquals(today.id, overview.getNextDelivery().getId());
        assertEquals("2026-05-27", overview.getNextDelivery().getDeliveryDate());
        assertEquals("OPEN", overview.getNextDelivery().getStatus());
    }

    @Test
    void customerDeliveryOverviewReturnsNullWhenOneSideIsMissing() {
        Delivery future = openDelivery(CUSTOMER_ID, LocalDate.of(2026, 6, 2), item(ARTICLE_NUMBER_10001, 1));

        CustomerDeliveryOverviewDto overview = service.toCustomerDeliveryOverview(
                List.of(future),
                LocalDate.of(2026, 5, 27)
        );

        assertNull(overview.getLastDelivery());
        assertEquals("2026-06-02", overview.getNextDelivery().getDeliveryDate());

        overview = service.toCustomerDeliveryOverview(
                List.of(deliveredDelivery(CUSTOMER_ID, LocalDate.of(2026, 5, 20), item(ARTICLE_NUMBER_10001, 1))),
                LocalDate.of(2026, 5, 27)
        );

        assertEquals("2026-05-20", overview.getLastDelivery().getDeliveryDate());
        assertNull(overview.getNextDelivery());
    }

    @Test
    void parsesDeliveryMonthInExpectedFormat() {
        assertEquals(YearMonth.of(2026, 6), service.parseDeliveryMonth("06.2026"));
    }

    @Test
    void rejectsDeliveryMonthInUnexpectedFormat() {
        assertThrows(BadRequestException.class, () -> service.parseDeliveryMonth("6.2026"));
        assertThrows(BadRequestException.class, () -> service.parseDeliveryMonth("13.2026"));
        assertThrows(BadRequestException.class, () -> service.parseDeliveryMonth("2026-06"));
    }

    @Test
    void returnsUniqueCustomerIdsForDeliveriesDeliveredInsideMonth() {
        Delivery firstJuneDelivery = deliveryWithDeliveredAt(
                MONTHLY_DELIVERED_CUSTOMER_ID,
                LocalDateTime.of(2026, 6, 1, 0, 0)
        );
        Delivery duplicateCustomerDelivery = deliveryWithDeliveredAt(
                MONTHLY_DELIVERED_CUSTOMER_ID,
                LocalDateTime.of(2026, 6, 30, 23, 59)
        );
        Delivery secondJuneDelivery = deliveryWithDeliveredAt("customer-a", LocalDateTime.of(2026, 6, 15, 12, 0));
        Delivery plannedInJuneButDeliveredInMay = deliveryWithDeliveredAt("customer-c", LocalDateTime.of(2026, 5, 31, 23, 59));
        plannedInJuneButDeliveredInMay.deliveryDate = LocalDate.of(2026, 6, 1);
        Delivery deliveredAtNextMonthStart = deliveryWithDeliveredAt("customer-d", LocalDateTime.of(2026, 7, 1, 0, 0));
        Delivery notDelivered = openDelivery("customer-e", LocalDate.of(2026, 6, 15), item(ARTICLE_NUMBER_10088, 1));

        List<String> customerIds = service.customerIdsWithDeliveredAtInPeriod(
                List.of(
                        firstJuneDelivery,
                        duplicateCustomerDelivery,
                        secondJuneDelivery,
                        plannedInJuneButDeliveredInMay,
                        deliveredAtNextMonthStart,
                        notDelivered
                ),
                LocalDateTime.of(2026, 6, 1, 0, 0),
                LocalDateTime.of(2026, 7, 1, 0, 0)
        );

        assertIterableEquals(List.of("customer-a", MONTHLY_DELIVERED_CUSTOMER_ID), customerIds);
    }

    private OrderDto order(
            Long id,
            String customerId,
            String productId,
            int quantity,
            int interval,
            LocalDate createdAt
    ) {
        OrderDto order = new OrderDto();
        order.setId(id);
        order.setCustomerId(customerId);
        order.setProductId(productId);
        order.setQuantity(quantity);
        order.setInterval(interval);
        order.setStatus("ACTIVE");
        order.setCreatedAt(createdAt.atStartOfDay());
        return order;
    }

    private UserDto user(String deliveryDay) {
        UserDto user = new UserDto();
        user.setDeliveryDay(deliveryDay);
        return user;
    }

    private Delivery deliveryWithExistingItem() {
        Delivery delivery = new Delivery();
        delivery.orderId = "1";
        delivery.userId = CUSTOMER_ID;
        delivery.deliveryDate = LocalDate.of(2026, 6, 9);
        delivery.acceptedAt = LocalDateTime.of(2026, 6, 1, 10, 0);

        DeliveryItem item = new DeliveryItem();
        item.articleNumber = ARTICLE_NUMBER_10001;
        item.name = "Existing item";
        item.unit = "Stueck";
        item.quantity = 1;
        delivery.addItem(item);

        return delivery;
    }

    private Delivery deliveredDelivery(String customerId, LocalDate deliveryDate, DeliveryItem... items) {
        Delivery delivery = openDelivery(customerId, deliveryDate, items);
        delivery.deliveredAt = deliveryDate.atTime(14, 0);
        for (DeliveryItem item : delivery.items) {
            item.delivered = true;
        }
        return delivery;
    }

    private Delivery openDelivery(String customerId, LocalDate deliveryDate, DeliveryItem... items) {
        Delivery delivery = new Delivery();
        delivery.orderId = "test-order";
        delivery.userId = customerId;
        delivery.deliveryDate = deliveryDate;
        for (DeliveryItem item : items) {
            delivery.addItem(item);
        }
        return delivery;
    }

    private Delivery deliveryWithDeliveredAt(String customerId, LocalDateTime deliveredAt) {
        Delivery delivery = openDelivery(customerId, deliveredAt.toLocalDate(), item(ARTICLE_NUMBER_10001, 1));
        delivery.deliveredAt = deliveredAt;
        for (DeliveryItem item : delivery.items) {
            item.delivered = true;
        }
        return delivery;
    }

    private DeliveryItem item(String articleNumber, int quantity) {
        DeliveryItem item = new DeliveryItem();
        item.articleNumber = articleNumber;
        item.name = "Test article " + articleNumber;
        item.unit = "Stueck";
        item.quantity = quantity;
        return item;
    }
}
