package de.restockoffice.delivery;

import java.util.UUID;

public class DeliverySummaryDto {
    private UUID id;
    private String deliveryDate;
    private String status;

    public DeliverySummaryDto() {
    }

    public DeliverySummaryDto(UUID id, String deliveryDate, String status) {
        this.id = id;
        this.deliveryDate = deliveryDate;
        this.status = status;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getDeliveryDate() {
        return deliveryDate;
    }

    public void setDeliveryDate(String deliveryDate) {
        this.deliveryDate = deliveryDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
