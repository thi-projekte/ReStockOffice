package de.restockoffice;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import com.fasterxml.jackson.annotation.JsonIgnore;
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

    // Reference to orders service — no DB join
    @Column(name = "order_id", nullable = false)
    public String orderId;

    // Reference to users service — no DB join
    // This is the Keycloak userId of the customer company
    @Column(name = "user_id", nullable = false)
    public String userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tour_id")
    @JsonIgnore
    public Tour tour;

    @Column(name = "stop_order", nullable = false)
    public int stopOrder;

    // True when restocker checks off package in warehouse → stock decreases
    @Column(name = "collected", nullable = false)
    public boolean collected = false;

    @Column(name = "collected_at")
    public LocalDateTime collectedAt;

    // Set when restocker presses "Nächste Zustellung" — timestamp sent to company
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

    public boolean allItemsDelivered() {
        return this.items.stream().allMatch(i -> i.delivered);
    }

    public void addItem(DeliveryItem item) {
        item.delivery = this;
        this.items.add(item);
    }

    public static List<Delivery> findByTour(UUID tourId) {
        return list("tour.id", tourId);
    }
}
