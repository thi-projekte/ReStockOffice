package de.restockoffice;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "warehouse_items")
public class WarehouseItem extends PanacheEntityBase {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    public UUID id;

    @Column(nullable = false)
    public String name;

    @Column(name = "article_number", unique = true)
    public String articleNumber;   // e.g. "10001"

    @Column(nullable = false)
    public String unit;            // e.g. "pieces", "boxes", "rolls"

    @Column(nullable = false)
    public int quantity;

    // ── Convenience methods ──────────────────────

    /**
     * Reduces stock when restocker collects package from warehouse.
     * Throws if not enough stock available.
     */
    public void reduceStock(int amount) {
        if (this.quantity < amount) {
            throw new IllegalStateException(
                    "Not enough stock for '" + this.name + "'. " +
                            "Available: " + this.quantity + ", requested: " + amount
            );
        }
        this.quantity -= amount;
    }

    public static WarehouseItem findByArticleNumber(String articleNumber) {
        return find("articleNumber", articleNumber).firstResult();
    }
}