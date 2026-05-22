package de.restockoffice;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Enriched delivery response combining data from:
 * - restocker-deliveries DB (collected, deliveredAt, stopOrder)
 * - users service (companyName, address, phone, deliveryHint)
 * - orders service (items, deliveryDate)
 */
public class DeliveryDetailDto {

    public UUID id;
    public String orderId;
    public String userId;
    public int stopOrder;
    public boolean collected;
    public LocalDateTime collectedAt;
    public LocalDateTime deliveredAt;

    // From users service
    public String companyName;
    public String street;
    public String houseNumber;
    public String postalCode;
    public String city;
    public String country;
    public String phoneNumber;
    public String contactPerson;   // roleInCompany as contact label
    public String deliveryHint;
    public String deliveryDay;
    public Integer deliveryTime;

    // From orders service
    public String deliveryDate;
    public List<DeliveryItemDetailDto> items;

    public static class DeliveryItemDetailDto {
        public UUID id;
        public String articleNumber;
        public String name;
        public int quantity;
        public String unit;
        public boolean delivered;
    }
}
