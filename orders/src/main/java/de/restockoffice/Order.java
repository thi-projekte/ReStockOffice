package de.restockoffice;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
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
    private static final Clock BUSINESS_CLOCK = Clock.system(ZoneId.of("Europe/Berlin"));

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

    private LocalDateTime createdAt = currentTimestamp();
    private LocalDateTime updatedAt;

    static LocalDateTime currentTimestamp() {
        return LocalDateTime.now(BUSINESS_CLOCK);
    }

    public static Order order(String customerId, String productId, String status, int quantity, int interval) {
        LOG.info("STATIC bestellen() CALLED");
        Order bestellung = new Order();
        bestellung.customerId = customerId;
        bestellung.productId = productId;
        bestellung.status = status;
        bestellung.quantity = quantity;
        bestellung.interval = interval;
        bestellung.createdAt = currentTimestamp();
        return bestellung;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
