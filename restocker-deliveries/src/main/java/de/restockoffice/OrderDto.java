package de.restockoffice;

import java.time.LocalDateTime;

public class OrderDto {
    public Long id;
    public String customerId;
    public String productId;
    public String status;
    public Integer quantity;
    public Integer interval;
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;
}
