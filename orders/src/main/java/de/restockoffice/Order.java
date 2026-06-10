package de.restockoffice;

import java.time.LocalDateTime;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.jboss.logging.Logger;


@Entity
@Table(name = "orders_tb")
public class Order extends PanacheEntity {

    private static final Logger LOG = Logger.getLogger(Order.class);

    @NotNull
    public String customerId;

    @NotNull
    public String productId;

    @NotNull
    public String status = "ACTIVE";

    @Min(1)
    public Integer quantity;

    @NotNull
    public Integer interval;

    public LocalDateTime createdAt = LocalDateTime.now();
    public LocalDateTime updatedAt;

    public static Order order(String customerId, String productId, String status, int quantity, int interval) {
        LOG.info("STATIC bestellen() CALLED");
        Order bestellung = new Order();
        bestellung.customerId = customerId;
        bestellung.productId = productId;
        bestellung.status = status;
        bestellung.quantity = quantity;
        bestellung.interval = interval;
        bestellung.createdAt = LocalDateTime.now();
        return bestellung;
    }
}