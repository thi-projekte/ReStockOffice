package de.restockoffice;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertIterableEquals;

class DeliveryServiceTest {

    private final DeliveryService service = new DeliveryService();

    @Test
    void planningHorizonIsFourteenDays() {
        assertEquals(14, DeliveryService.PLANNING_HORIZON_DAYS);
    }

    @Test
    void deliveryDayChangeKeepsFourWeekIntervalAnchorFromExistingDeliveries() {
        OrderDto order = order(1L, "customer-1", "10001", 1, 4, LocalDate.of(2026, 5, 1));
        UserDto user = user("Donnerstag");

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
        OrderDto order = order(1L, "customer-1", "10001", 1, 1, LocalDate.of(2026, 5, 1));
        UserDto user = user("Donnerstag");

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
        OrderDto order = order(1L, "customer-1", "10001", 1, 1, LocalDate.of(2026, 6, 5));
        UserDto user = user("Dienstag");

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
        OrderDto order = order(2L, "customer-1", "10002", 1, 1, LocalDate.of(2026, 6, 4));
        UserDto user = user("Donnerstag");

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
        OrderDto order = order(2L, "customer-1", "10002", 1, 1, LocalDate.of(2026, 6, 8));
        UserDto user = user("Donnerstag");

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
        OrderDto changedOrder = order(1L, "customer-1", "10001", 99, 1, LocalDate.of(2026, 5, 1));

        service.appendNewOrdersToDelivery(delivery, List.of(changedOrder));

        assertEquals("1", delivery.orderId);
        assertEquals(1, delivery.items.size());
        assertEquals(1, delivery.items.getFirst().quantity);
    }

    @Test
    void newOrdersAreAppendedToExistingFutureDeliveries() {
        Delivery delivery = deliveryWithExistingItem();
        OrderDto existingOrder = order(1L, "customer-1", "10001", 99, 1, LocalDate.of(2026, 5, 1));
        OrderDto newOrder = order(2L, "customer-1", "10002", 3, 1, LocalDate.of(2026, 5, 1));

        service.appendNewOrdersToDelivery(delivery, List.of(existingOrder, newOrder));

        assertEquals("1,2", delivery.orderId);
        assertEquals(2, delivery.items.size());
        assertEquals("10002", delivery.items.get(1).articleNumber);
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
                "customer-1",
                LocalDate.of(2026, 4, 3),
                item("10088", 1),
                item("10007", 5)
        );
        Delivery secondDeliveredInPreviousMonth = deliveredDelivery(
                "customer-1",
                LocalDate.of(2026, 4, 28),
                item("10088", 2),
                item("10007", 15)
        );
        Delivery deliveredInOtherMonth = deliveredDelivery(
                "customer-1",
                LocalDate.of(2026, 3, 31),
                item("10088", 100)
        );
        Delivery openInPreviousMonth = openDelivery(
                "customer-1",
                LocalDate.of(2026, 4, 15),
                item("10088", 50)
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
        assertEquals("10088", summary.get(0).articleNumber);
        assertEquals(3, summary.get(0).quantity);
        assertEquals("10007", summary.get(1).articleNumber);
        assertEquals(20, summary.get(1).quantity);
    }

    @Test
    void customerDeliveryOverviewReturnsPreviousAndNextDelivery() {
        Delivery previous = deliveredDelivery("customer-1", LocalDate.of(2026, 5, 20), item("10001", 1));
        Delivery older = deliveredDelivery("customer-1", LocalDate.of(2026, 5, 1), item("10002", 1));
        Delivery today = openDelivery("customer-1", LocalDate.of(2026, 5, 27), item("10003", 1));
        Delivery future = openDelivery("customer-1", LocalDate.of(2026, 6, 2), item("10004", 1));
        older.id = UUID.fromString("00000000-0000-0000-0000-000000000001");
        previous.id = UUID.fromString("00000000-0000-0000-0000-000000000002");
        today.id = UUID.fromString("00000000-0000-0000-0000-000000000003");
        future.id = UUID.fromString("00000000-0000-0000-0000-000000000004");

        CustomerDeliveryOverviewDto overview = service.toCustomerDeliveryOverview(
                List.of(today, future, older, previous),
                LocalDate.of(2026, 5, 27)
        );

        assertEquals(previous.id, overview.lastDelivery.id);
        assertEquals("2026-05-20", overview.lastDelivery.deliveryDate);
        assertEquals("DELIVERED", overview.lastDelivery.status);
        assertEquals(today.id, overview.nextDelivery.id);
        assertEquals("2026-05-27", overview.nextDelivery.deliveryDate);
        assertEquals("OPEN", overview.nextDelivery.status);
    }

    @Test
    void customerDeliveryOverviewReturnsNullWhenOneSideIsMissing() {
        Delivery future = openDelivery("customer-1", LocalDate.of(2026, 6, 2), item("10001", 1));

        CustomerDeliveryOverviewDto overview = service.toCustomerDeliveryOverview(
                List.of(future),
                LocalDate.of(2026, 5, 27)
        );

        assertNull(overview.lastDelivery);
        assertEquals("2026-06-02", overview.nextDelivery.deliveryDate);

        overview = service.toCustomerDeliveryOverview(
                List.of(deliveredDelivery("customer-1", LocalDate.of(2026, 5, 20), item("10001", 1))),
                LocalDate.of(2026, 5, 27)
        );

        assertEquals("2026-05-20", overview.lastDelivery.deliveryDate);
        assertNull(overview.nextDelivery);
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
        order.id = id;
        order.customerId = customerId;
        order.productId = productId;
        order.quantity = quantity;
        order.interval = interval;
        order.status = "ACTIVE";
        order.createdAt = createdAt.atStartOfDay();
        return order;
    }

    private UserDto user(String deliveryDay) {
        UserDto user = new UserDto();
        user.deliveryDay = deliveryDay;
        return user;
    }

    private Delivery deliveryWithExistingItem() {
        Delivery delivery = new Delivery();
        delivery.orderId = "1";
        delivery.userId = "customer-1";
        delivery.deliveryDate = LocalDate.of(2026, 6, 9);
        delivery.acceptedAt = LocalDateTime.of(2026, 6, 1, 10, 0);

        DeliveryItem item = new DeliveryItem();
        item.articleNumber = "10001";
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

    private DeliveryItem item(String articleNumber, int quantity) {
        DeliveryItem item = new DeliveryItem();
        item.articleNumber = articleNumber;
        item.name = "Test article " + articleNumber;
        item.unit = "Stueck";
        item.quantity = quantity;
        return item;
    }
}
