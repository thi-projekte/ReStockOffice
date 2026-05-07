package org.acme;

import java.time.LocalDateTime;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

//test
@Entity
@Table(name = "orders")
public class Order extends PanacheEntity {

    @NotNull
    public String customerId;

    @NotNull
    public Integer productId;

    @NotNull
    public String status = "ACTIVE";

    @Min(1)
    public Integer quantity;

    @NotNull
    public Integer interval;

    public LocalDateTime createdAt = LocalDateTime.now();
    public LocalDateTime updatedAt;

    public static Order order(String customerId, int productId, String status, int quantity, int interval) {
        System.out.println("🔥 STATIC bestellen() CALLED");
        Order bestellung = new Order();
        bestellung.customerId = customerId;
        bestellung.productId = productId;
        bestellung.status = status;
        bestellung.quantity = quantity;
        bestellung.interval = interval;
        bestellung.createdAt = LocalDateTime.now();
        System.out.println("✅ ORDER READY (NOT SAVED YET)");
        return bestellung;
    }
}