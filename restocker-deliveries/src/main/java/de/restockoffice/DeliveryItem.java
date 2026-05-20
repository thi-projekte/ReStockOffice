package de.restockoffice;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "delivery_items")
public class DeliveryItem extends PanacheEntityBase {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_id", nullable = false)
    @JsonIgnore
    public Delivery delivery;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "warehouse_item_id", nullable = false)
    public WarehouseItem warehouseItem;

    @Column(name = "article_number")
    public String articleNumber;   // e.g. "10001"

    @Column(nullable = false)
    public int quantity;

    // Checked off by restocker when physically unpacking at company (eingeräumt)
    @Column(name = "delivered", nullable = false)
    public boolean delivered = false;

    // ── Convenience methods ──────────────────────

    public void markDelivered() {
        this.delivered = true;
    }
}
