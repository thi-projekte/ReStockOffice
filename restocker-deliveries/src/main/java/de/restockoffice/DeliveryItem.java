package de.restockoffice;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "delivery_items")
public class DeliveryItem extends PanacheEntityBase {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    public UUID id;

    @ManyToOne
    @JoinColumn(name = "delivery_id", nullable = false)
    @JsonIgnore
    public Delivery delivery;

    @Column(name = "article_number")
    public String articleNumber;

    @Column(name = "warehouse_item_id")
    public String warehouseItemId;

    @Column(name = "article_name")
    public String name;

    @Column(name = "article_unit")
    public String unit;

    @Column(nullable = false)
    public int quantity;

    @Column(name = "delivered", nullable = false)
    public boolean delivered = false;

    public void markDelivered() {
        this.delivered = true;
    }
}
