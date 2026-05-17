package de.restockoffice;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import org.eclipse.microprofile.rest.client.inject.RestClient;

import java.math.BigDecimal;
import java.util.List;
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

    // ── Tour management ──────────────────────────

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

    // ── Warehouse collection ─────────────────────

    /**
     * Restocker checks off a package in the warehouse.
     * Reduces warehouse stock at this moment.
     */
    @Transactional
    public Delivery collectPackage(UUID deliveryId) {
        Delivery delivery = findDeliveryOrThrow(deliveryId);
        if (delivery.collected) {
            throw new BadRequestException("Paket wurde bereits eingesammelt.");
        }
        for (DeliveryItem item : delivery.items) {
            item.warehouseItem.reduceStock(item.quantity);
        }
        delivery.markCollected();
        return delivery;
    }

    // ── Delivery confirmation ────────────────────

    @Transactional
    public DeliveryItem markItemDelivered(UUID itemId) {
        DeliveryItem item = DeliveryItem.findById(itemId);
        if (item == null) throw new NotFoundException("Artikel nicht gefunden: " + itemId);
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

    // ── Enriched detail — combines delivery + user + order ──

    /**
     * Returns a delivery enriched with data from users and orders service.
     * The frontend only needs to call this one endpoint.
     */
    public DeliveryDetailDto getDeliveryDetail(UUID deliveryId, String authorizationHeader) {
        Delivery delivery = findDeliveryOrThrow(deliveryId);

        UserDto user = userClient.getUserById(delivery.userId, authorizationHeader);
        OrderDto order = orderClient.getOrderById(parseOrderId(delivery.orderId), authorizationHeader);

        return toDetailDto(delivery, user, order);
    }

    public List<DeliveryDetailDto> getTourDeliveryDetails(UUID tourId, String authorizationHeader) {
        List<Delivery> deliveries = Delivery.findByTour(tourId);
        return deliveries.stream()
                .map(d -> {
                    UserDto user = userClient.getUserById(d.userId, authorizationHeader);
                    OrderDto order = orderClient.getOrderById(parseOrderId(d.orderId), authorizationHeader);
                    return toDetailDto(d, user, order);
                })
                .collect(Collectors.toList());
    }

    // ── Warehouse items ──────────────────────────

    public List<WarehouseItem> getAllWarehouseItems() {
        return WarehouseItem.listAll();
    }

    // ── Mapping ──────────────────────────────────

    private DeliveryDetailDto toDetailDto(Delivery delivery, UserDto user, OrderDto order) {
        DeliveryDetailDto dto = new DeliveryDetailDto();
        dto.id = delivery.id;
        dto.orderId = delivery.orderId;
        dto.userId = delivery.userId;
        dto.stopOrder = delivery.stopOrder;
        dto.collected = delivery.collected;
        dto.collectedAt = delivery.collectedAt;
        dto.deliveredAt = delivery.deliveredAt;

        // From users service
        dto.companyName = user.companyName;
        dto.street = user.street + " " + user.houseNumber;
        dto.postalCode = user.postalCode;
        dto.city = user.city;
        dto.phoneNumber = user.phoneNumber;
        dto.contactPerson = user.roleInCompany;
        dto.deliveryHint = user.deliveryHint;

        // From orders service
        dto.houseNumber = user.houseNumber;
        dto.deliveryDate = delivery.tour != null && delivery.tour.tourDate != null
                ? delivery.tour.tourDate.toString()
                : null;
        dto.items = delivery.items.stream().map(item -> {
            DeliveryDetailDto.DeliveryItemDetailDto i = new DeliveryDetailDto.DeliveryItemDetailDto();
            i.id = item.id;
            i.articleNumber = item.articleNumber;
            i.delivered = item.delivered;
            // match warehouse item name with order item if available
            i.name = item.warehouseItem.name;
            i.quantity = item.quantity;
            i.unit = item.warehouseItem.unit;
            return i;
        }).collect(Collectors.toList());

        return dto;
    }

    // ── Helpers ──────────────────────────────────

    private Tour findTourOrThrow(UUID tourId) {
        Tour tour = Tour.findById(tourId);
        if (tour == null) throw new NotFoundException("Tour nicht gefunden: " + tourId);
        return tour;
    }

    private Delivery findDeliveryOrThrow(UUID deliveryId) {
        Delivery delivery = Delivery.findById(deliveryId);
        if (delivery == null) throw new NotFoundException("Lieferung nicht gefunden: " + deliveryId);
        return delivery;
    }

    private Long parseOrderId(String orderId) {
        try {
            return Long.valueOf(orderId);
        } catch (NumberFormatException exception) {
            throw new BadRequestException("Ungültige Order-ID: " + orderId);
        }
    }
}
