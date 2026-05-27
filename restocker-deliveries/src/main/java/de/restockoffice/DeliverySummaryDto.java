package de.restockoffice;

import java.util.UUID;

public class DeliverySummaryDto {
    public UUID id;
    public String deliveryDate;
    public String status;

    public DeliverySummaryDto(UUID id, String deliveryDate, String status) {
        this.id = id;
        this.deliveryDate = deliveryDate;
        this.status = status;
    }
}
