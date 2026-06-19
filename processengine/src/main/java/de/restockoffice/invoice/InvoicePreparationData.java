package de.restockoffice.invoice;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record InvoicePreparationData(
        String userId,
        String email,
        String companyName,
        String street,
        String postalCode,
        String city,
        List<Map<String, Object>> orderItems,
        BigDecimal totalNet
) {}
