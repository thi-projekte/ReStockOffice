package de.restockoffice.delivery;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@ApplicationScoped
public class DeliveryReportingService {

    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("MM.uuuu")
            .withResolverStyle(ResolverStyle.STRICT);

    private final EntityManager entityManager;

    @Inject
    public DeliveryReportingService(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Transactional
    public List<DeliveredArticleSummaryDto> getDeliveredArticleSummaryForPreviousMonth(String customerId) {
        String normalizedCustomerId = normalizeRequiredCustomerId(customerId);
        LocalDate currentMonthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate previousMonthStart = currentMonthStart.minusMonths(1);
        LocalDate previousMonthEnd = currentMonthStart.minusDays(1);
        List<Delivery> deliveries = Delivery.findDeliveredByCustomerBetween(normalizedCustomerId, previousMonthStart,
                previousMonthEnd);

        return summarizeDeliveredItemsForPeriod(deliveries, previousMonthStart, previousMonthEnd);
    }

    @Transactional
    public CustomerDeliveryOverviewDto getCustomerDeliveryOverview(String customerId) {
        String normalizedCustomerId = normalizeRequiredCustomerId(customerId);
        return toCustomerDeliveryOverview(Delivery.findByCustomer(normalizedCustomerId), LocalDate.now());
    }

    @Transactional
    public MonthlyDeliveryCustomersDto getCustomersWithDeliveriesInMonth(String monthValue) {
        String normalizedMonth = normalizeDeliveryMonth(monthValue);
        YearMonth month = parseDeliveryMonth(normalizedMonth);
        LocalDateTime monthStart = month.atDay(1).atStartOfDay();
        LocalDateTime nextMonthStart = month.plusMonths(1).atDay(1).atStartOfDay();

        return new MonthlyDeliveryCustomersDto(normalizedMonth,
                findCustomerIdsDeliveredBetween(monthStart, nextMonthStart));
    }

    static List<DeliveredArticleSummaryDto> summarizeDeliveredItemsForPeriod(List<Delivery> deliveries,
            LocalDate periodStart, LocalDate periodEnd) {
        if (deliveries == null || deliveries.isEmpty()) {
            return List.of();
        }

        Map<String, Integer> quantitiesByArticle = new LinkedHashMap<>();
        for (Delivery delivery : deliveries) {
            if (!isDeliveredInPeriod(delivery, periodStart, periodEnd) || delivery.items == null) {
                continue;
            }

            for (DeliveryItem item : delivery.items) {
                if (item == null || isBlank(item.articleNumber)) {
                    continue;
                }

                quantitiesByArticle.merge(item.articleNumber, item.quantity, Integer::sum);
            }
        }

        return quantitiesByArticle.entrySet().stream()
                .map(entry -> new DeliveredArticleSummaryDto(entry.getKey(), entry.getValue())).toList();
    }

    static CustomerDeliveryOverviewDto toCustomerDeliveryOverview(List<Delivery> deliveries, LocalDate today) {
        Delivery lastDelivery = null;
        Delivery nextDelivery = null;

        if (deliveries != null) {
            List<Delivery> sortedDeliveries = deliveries.stream()
                    .filter(delivery -> delivery != null && delivery.deliveryDate != null)
                    .sorted(Comparator.comparing(delivery -> delivery.deliveryDate)).toList();

            for (Delivery delivery : sortedDeliveries) {
                if (delivery.deliveryDate.isBefore(today)) {
                    lastDelivery = delivery;
                    continue;
                }

                if (nextDelivery == null) {
                    nextDelivery = delivery;
                }
            }
        }

        return new CustomerDeliveryOverviewDto(toDeliverySummary(lastDelivery), toDeliverySummary(nextDelivery));
    }

    static List<String> customerIdsWithDeliveredAtInPeriod(List<Delivery> deliveries, LocalDateTime periodStart,
            LocalDateTime periodEndExclusive) {
        if (deliveries == null || deliveries.isEmpty()) {
            return List.of();
        }

        return deliveries.stream().filter(Objects::nonNull).filter(delivery -> !isBlank(delivery.userId))
                .filter(delivery -> isDeliveredAtInPeriod(delivery, periodStart, periodEndExclusive))
                .map(delivery -> delivery.userId).distinct().sorted().toList();
    }

    private List<String> findCustomerIdsDeliveredBetween(LocalDateTime periodStart, LocalDateTime periodEndExclusive) {
        return entityManager.createQuery(
                "select distinct d.userId from Delivery d " + "where d.userId is not null and d.userId <> '' "
                        + "and d.deliveredAt >= :periodStart and d.deliveredAt < :periodEnd " + "order by d.userId asc",
                String.class).setParameter("periodStart", periodStart).setParameter("periodEnd", periodEndExclusive)
                .getResultList();
    }

    private static DeliverySummaryDto toDeliverySummary(Delivery delivery) {
        if (delivery == null) {
            return null;
        }

        return new DeliverySummaryDto(delivery.id, requireDeliveryDate(delivery).toString(), deliveryStatus(delivery));
    }

    private static boolean isDeliveredInPeriod(Delivery delivery, LocalDate periodStart, LocalDate periodEnd) {
        if (delivery == null || !delivery.isDelivered()) {
            return false;
        }

        LocalDate deliveryDate = delivery.deliveryDate;
        return deliveryDate != null && !deliveryDate.isBefore(periodStart) && !deliveryDate.isAfter(periodEnd);
    }

    private static boolean isDeliveredAtInPeriod(Delivery delivery, LocalDateTime periodStart,
            LocalDateTime periodEndExclusive) {
        LocalDateTime deliveredAt = delivery.deliveredAt;
        return deliveredAt != null && !deliveredAt.isBefore(periodStart) && deliveredAt.isBefore(periodEndExclusive);
    }

    static YearMonth parseDeliveryMonth(String monthValue) {
        try {
            return YearMonth.parse(monthValue, MONTH_FORMATTER);
        } catch (DateTimeParseException exception) {
            throw new BadRequestException("month muss im Format MM.YYYY angegeben werden, z. B. 06.2026.");
        }
    }

    private String normalizeDeliveryMonth(String monthValue) {
        if (isBlank(monthValue)) {
            throw new BadRequestException("month muss angegeben werden.");
        }

        return monthValue.trim();
    }

    private String normalizeRequiredCustomerId(String customerId) {
        if (isBlank(customerId)) {
            throw new BadRequestException("customerId muss angegeben werden.");
        }

        return customerId.trim();
    }

    private static LocalDate requireDeliveryDate(Delivery delivery) {
        if (delivery.deliveryDate != null) {
            return delivery.deliveryDate;
        }

        throw new IllegalStateException("Delivery hat kein deliveryDate: " + delivery.id);
    }

    private static String deliveryStatus(Delivery delivery) {
        if (delivery.deliveredAt != null) {
            return "DELIVERED";
        }
        if (delivery.collected) {
            return "COLLECTED";
        }
        if (delivery.tour != null || delivery.acceptedAt != null) {
            return "ACCEPTED";
        }
        return "OPEN";
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
