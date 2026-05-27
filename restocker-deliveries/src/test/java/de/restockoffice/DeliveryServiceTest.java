package de.restockoffice;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
}
