package de.restockoffice.delivery;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class DeliveryTourService {

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
    public Delivery acceptDelivery(UUID deliveryId, String restockerName) {
        validateRestockerName(restockerName);

        Delivery delivery = findDeliveryOrThrow(deliveryId);
        if (delivery.isDelivered()) {
            throw new BadRequestException("Diese Lieferung wurde bereits ausgeliefert.");
        }

        if (delivery.tour != null) {
            if (!restockerName.equals(delivery.tour.restockerName)) {
                throw new BadRequestException("Diese Lieferung wurde bereits von einem anderen Restocker angenommen.");
            }
            return delivery;
        }

        Tour tour = findOrCreateOpenTour(restockerName, requireDeliveryDate(delivery));
        delivery.stopOrder = nextStopOrder(tour);
        delivery.markAccepted(tour);
        tour.deliveries.add(delivery);
        return delivery;
    }

    @Transactional
    public Delivery collectPackage(UUID deliveryId) {
        Delivery delivery = findDeliveryOrThrow(deliveryId);
        if (!delivery.collected) {
            delivery.markCollected();
        }
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

    private void validateRestockerName(String restockerName) {
        if (restockerName == null || restockerName.isBlank()) {
            throw new BadRequestException("Restocker fehlt.");
        }
    }
}
