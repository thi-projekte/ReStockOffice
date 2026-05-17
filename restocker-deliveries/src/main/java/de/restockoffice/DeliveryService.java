package de.restockoffice;

import de.restockoffice.Delivery;
import de.restockoffice.DeliveryItem;
import de.restockoffice.Tour;
import de.restockoffice.WarehouseItem;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class DeliveryService {

    // ── Tour management ──────────────────────────

    /**
     * Creates a new tour with its deliveries for the day.
     * Called when the restocker's day is planned.
     */
    @Transactional
    public Tour createTour(Tour tour) {
        tour.persist();
        return tour;
    }

    /**
     * Restocker presses "TOUR BEGINNEN".
     * Only allowed when all packages are collected from warehouse.
     */
    @Transactional
    public Tour startTour(UUID tourId) {
        Tour tour = findTourOrThrow(tourId);
        if (!tour.allPackagesCollected()) {
            throw new BadRequestException("Not all packages have been collected from the warehouse.");
        }
        tour.start();
        return tour;
    }

    /**
     * Restocker presses "TOUR BEENDEN" on the last stop.
     * Records end time and total earnings.
     */
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
     * Restocker checks off a package in the warehouse (EINGESAMMELT checkbox).
     * This is the moment stock decreases.
     */
    @Transactional
    public Delivery collectPackage(UUID deliveryId) {
        Delivery delivery = findDeliveryOrThrow(deliveryId);

        if (delivery.collected) {
            throw new BadRequestException("Package already collected.");
        }

        // Reduce warehouse stock for each item in this delivery
        for (DeliveryItem item : delivery.items) {
            WarehouseItem warehouseItem = item.warehouseItem;
            warehouseItem.reduceStock(item.quantity);  // throws if insufficient stock
        }

        delivery.markCollected();
        return delivery;
    }

    // ── Delivery (einräumen) ─────────────────────

    /**
     * Restocker checks off a single item at the company (EINGERÄUMT checkbox).
     */
    @Transactional
    public DeliveryItem markItemDelivered(UUID deliveryItemId) {
        DeliveryItem item = DeliveryItem.findById(deliveryItemId);
        if (item == null) throw new NotFoundException("Delivery item not found: " + deliveryItemId);
        item.markDelivered();
        return item;
    }

    /**
     * Restocker presses "NÄCHSTE ZUSTELLUNG" after checking all items.
     * Records confirmation timestamp — sent to company.
     * Only allowed when all items are checked off.
     */
    @Transactional
    public Delivery confirmDelivery(UUID deliveryId) {
        Delivery delivery = findDeliveryOrThrow(deliveryId);

        if (!delivery.allItemsDelivered()) {
            throw new BadRequestException("Not all items have been checked off (eingeräumt).");
        }

        delivery.markDelivered();
        return delivery;
    }

    // ── Queries ──────────────────────────────────

    public List<Delivery> getTodayDeliveries(UUID tourId) {
        return Delivery.findByTour(tourId);
    }

    public List<WarehouseItem> getAllWarehouseItems() {
        return WarehouseItem.listAll();
    }

    // ── Helpers ──────────────────────────────────

    private Tour findTourOrThrow(UUID tourId) {
        Tour tour = Tour.findById(tourId);
        if (tour == null) throw new NotFoundException("Tour not found: " + tourId);
        return tour;
    }

    private Delivery findDeliveryOrThrow(UUID deliveryId) {
        Delivery delivery = Delivery.findById(deliveryId);
        if (delivery == null) throw new NotFoundException("Delivery not found: " + deliveryId);
        return delivery;
    }
}