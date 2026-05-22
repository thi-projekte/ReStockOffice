package de.restockoffice;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

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

    @Column(name = "order_id", nullable = false)
    public String orderId;

    @Column(name = "user_id", nullable = false)
    public String userId;

    @ManyToOne
    @JoinColumn(name = "tour_id")
    @JsonIgnore
    public Tour tour;

    @Column(name = "stop_order", nullable = false)
    public int stopOrder;

    @Column(name = "collected", nullable = false)
    public boolean collected = false;

    @Column(name = "collected_at")
    public LocalDateTime collectedAt;

    @Column(name = "delivered_at")
    public LocalDateTime deliveredAt;

    @OneToMany(mappedBy = "delivery", cascade = CascadeType.ALL, orphanRemoval = true)
    public List<DeliveryItem> items = new ArrayList<>();

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
        return this.items.stream().allMatch(item -> item.delivered);
    }

    public void addItem(DeliveryItem item) {
        item.delivery = this;
        this.items.add(item);
    }

    public static List<Delivery> findByTour(UUID tourId) {
        return list("tour.id", tourId);
    }
}
