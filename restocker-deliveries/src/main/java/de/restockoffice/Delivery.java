package de.restockoffice;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "deliveries")
public class Delivery extends PanacheEntityBase {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    public UUID id;

    // Reference to the order from the orders service (no DB join)
    @Column(name = "order_id", nullable = false)
    public String orderId;

    // Tour this delivery belongs to
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tour_id")
    public Tour tour;

    // Position in the tour route (1, 2, 3 ...)
    @Column(name = "stop_order", nullable = false)
    public int stopOrder;

    // ── Company info (fetched from orders API, stored locally) ──
    @Column(name = "company_name", nullable = false)
    public String companyName;

    @Column(name = "street", nullable = false)
    public String street;

    @Column(name = "zip_code", nullable = false)
    public String zipCode;

    @Column(name = "city", nullable = false)
    public String city;

    @Column(name = "delivery_date", nullable = false)
    public java.time.LocalDate deliveryDate;

    @Column(name = "delivery_time")
    public String deliveryTime;   // e.g. "11:00 Uhr"

    // ── Contact & hints ──
    @Column(name = "contact_person")
    public String contactPerson;

    @Column(name = "contact_phone")
    public String contactPhone;

    @Column(name = "delivery_notes", length = 500)
    public String deliveryNotes;  // e.g. "Warenannahme Tor 2, Stock 4"

    // ── State flags ──

    // True when restocker checks off package in warehouse → stock decreases
    @Column(name = "collected", nullable = false)
    public boolean collected = false;

    @Column(name = "collected_at")
    public LocalDateTime collectedAt;

    // Set when restocker presses "NÄCHSTE ZUSTELLUNG" after checking all items
    @Column(name = "delivered_at")
    public LocalDateTime deliveredAt;

    @OneToMany(mappedBy = "delivery", cascade = CascadeType.ALL, orphanRemoval = true)
    public List<DeliveryItem> items = new ArrayList<>();

    // ── Convenience methods ──────────────────────

    public void markCollected() {
        this.collected = true;
        this.collectedAt = LocalDateTime.now();
    }

    public void markDelivered() {
        this.deliveredAt = LocalDateTime.now();
    }

    public boolean isDelivered() {
        return this.deliveredAt != null;
    }

    // All items checked off (eingeräumt) → "Nächste Zustellung" can be pressed
    public boolean allItemsDelivered() {
        return this.items.stream().allMatch(i -> i.delivered);
    }

    public void addItem(DeliveryItem item) {
        item.delivery = this;
        this.items.add(item);
    }

    // Full address string for Google Maps
    public String getFullAddress() {
        return street + ", " + zipCode + " " + city;
    }

    public static List<Delivery> findByTour(UUID tourId) {
        return list("tour.id", tourId);
    }

    public static List<Delivery> findTodayUncollected() {
        return list("collected = false and deliveryDate = ?1",
                java.time.LocalDate.now());
    }
}