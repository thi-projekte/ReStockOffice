package de.restockoffice;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class DeliveryPublicationDto {
    public UUID deliveryId;
    public String orderId;
    public String customerId;
    public String aboId;
    public LocalDate deliveryDate;
    public boolean published;
    public LocalDateTime publishedAt;
}
