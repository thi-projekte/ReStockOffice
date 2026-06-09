package de.restockoffice;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class MailDataEnrichmentService {

    private static final Logger log = LoggerFactory.getLogger(MailDataEnrichmentService.class);
    private static final Locale GERMAN = Locale.GERMANY;
    private static final ZoneId UTC = ZoneId.of("UTC");
    private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy", GERMAN);
    private static final DateTimeFormatter DISPLAY_DATE_TIME = DateTimeFormatter.ofPattern("dd.MM.yyyy, HH:mm 'Uhr'", GERMAN);

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ordersservice.base-url:https://orders.restockoffice.de}")
    private String ordersServiceBaseUrl;

    @Value("${usersservice.base-url:https://users.restockoffice.de}")
    private String usersServiceBaseUrl;

    @Value("${articlesservice.base-url:https://articles.restockoffice.de}")
    private String articlesServiceBaseUrl;

    @Value("${deliveriesservice.base-url:https://restocker-deliveries.restockoffice.de}")
    private String deliveriesServiceBaseUrl;

    @Value("${restockoffice.app-base-url:https://app.restockoffice.de}")
    private String appBaseUrl;

    public void enrichAboConfirmation(DelegateExecution execution) {
        List<EnrichmentContext> contexts = loadAboConfirmationContexts(execution);
        EnrichmentContext context = contexts.isEmpty() ? loadContext(execution) : contexts.get(0);
        enrichCommonVariables(execution, context);

        OrderDto order = context.order();
        ArticleDto article = context.article();
        LocalDate deliveryDate = resolveDeliveryDate(context);

        setIfBlank(execution, "orderDate", formatDateTime(resolveOrderCreatedAt(order)));
        setIfBlank(execution, "changeDeadline", formatDateTime(deliveryDate.minusDays(3).atTime(12, 0)));
        setIfBlank(execution, "manageSubscriptionUrl", appBaseUrl + "/subscription");
        setIfBlank(execution, "itemIntervalDescription", formatInterval(resolveInterval(execution, order)));
        setIfBlank(execution, "itemNextDeliveryDate", formatDate(deliveryDate));

        if (article != null) {
            setIfBlank(execution, "itemArticleNumber", firstNonBlank(article.productId, context.productId()));
            setIfBlank(execution, "itemName", firstNonBlank(article.name, "Artikel " + context.productId()));
        }

        setIfBlank(execution, "itemQuantity", formatOrderItemQuantity(resolveQuantity(execution, order), article));
        execution.setVariable("orderItems", buildAboOrderItems(execution, contexts.isEmpty() ? List.of(context) : contexts));
    }

    public void enrichDeliveryAnnouncement(DelegateExecution execution) {
        EnrichmentContext context = loadContext(execution);
        enrichCommonVariables(execution, context);
        setDeliveryItemsVariable(execution, context.delivery());

        LocalDate deliveryDate = resolveDeliveryDate(context);
        setIfBlank(execution, "daysUntilDelivery", String.valueOf(Math.max(0, ChronoUnit.DAYS.between(LocalDate.now(), deliveryDate))));
        setIfBlank(execution, "deliveryDay", formatDayName(deliveryDate));
        setIfBlank(execution, "supplierName", firstNonBlank(restockerDisplayName(context.delivery()), "ReStockOffice"));
        setIfBlank(execution, "deliveryInstructions", firstNonBlank(userDeliveryHint(context.user()), "Bitte vor Ort nach Absprache abstellen."));
        setIfBlank(execution, "deliveryDetailsUrl", appBaseUrl + "/restocker/deliveries");
    }

    public void enrichDeliveryConfirmation(DelegateExecution execution) {
        EnrichmentContext context = loadContext(execution);
        enrichCommonVariables(execution, context);

        execution.setVariable("supplierName", firstNonBlank(restockerDisplayName(context.delivery()), "ReStockOffice"));
        setDeliveryItemsVariable(execution, context.delivery());
        setIfBlank(execution, "deliveryDetailsUrl", appBaseUrl + "/restocker/deliveries");
    }

    private void enrichCommonVariables(DelegateExecution execution, EnrichmentContext context) {
        OrderDto order = context.order();
        ArticleDto article = context.article();
        UserDto user = context.user();
        DeliveryDetailDto delivery = context.delivery();
        LocalDate deliveryDate = resolveDeliveryDate(context);

        setIfBlank(execution, "recipientEmail", firstNonBlank(deliveryRecipientEmail(delivery), userEmail(user)));
        setIfBlank(execution, "customerName", firstNonBlank(deliveryCompanyName(delivery), userCompanyName(user), context.customerId()));
        setIfBlank(execution, "orderNumber", formatOrderNumber(firstNonBlank(deliveryOrderId(delivery), orderId(order), context.orderId())));
        setIfBlank(execution, "deliveryDate", deliveryDate.atTime(8, 0).toString());
        setIfBlank(execution, "deliveryDateLabel", formatDate(deliveryDate));
        setIfBlank(execution, "deliveryWindow", formatDeliveryWindow(firstNonBlank(deliveryDeliveryTime(delivery), userDeliveryTime(user))));
        setIfBlank(execution, "deliveryLocation", formatDeliveryLocation(delivery, user));

        DeliveryItemDetailDto deliveryItem = firstDeliveryItem(delivery);
        if (deliveryItem != null) {
            setIfBlank(execution, "itemName", firstNonBlank(deliveryItem.name, article != null ? article.name : null, "Artikel " + context.productId()));
            setIfBlank(execution, "itemArticleNumber", firstNonBlank(deliveryItem.articleNumber, article != null ? article.productId : null, context.productId()));
            setIfBlank(execution, "itemQuantity", formatDeliveryItemQuantity(deliveryItem));
        }

        if (article != null) {
            setIfBlank(execution, "itemName", firstNonBlank(article.name, "Artikel " + context.productId()));
            setIfBlank(execution, "itemArticleNumber", firstNonBlank(article.productId, context.productId()));
        } else {
            setIfBlank(execution, "itemName", "Artikel " + context.productId());
            setIfBlank(execution, "itemArticleNumber", context.productId());
        }

        setIfBlank(execution, "itemQuantity", formatOrderItemQuantity(resolveQuantity(execution, order), article));
    }

    private EnrichmentContext loadContext(DelegateExecution execution) {
        return loadContext(execution, null);
    }

    private EnrichmentContext loadContext(DelegateExecution execution, String requestedOrderId) {
        String authorizationHeader = stringVariable(execution, "authorizationHeader");
        DeliveryMonitoringItem monitoringDelivery = monitoringDelivery(execution);
        String orderId = firstNonBlank(
                requestedOrderId,
                stringVariable(execution, "orderId"),
                stringVariable(execution, "deliveredOrderId"),
                monitoringDelivery != null ? monitoringDelivery.orderId() : null
        );
        OrderSnapshot orderSnapshot = orderSnapshot(execution, orderId);
        String customerId = firstNonBlank(
                orderSnapshot.customerId(),
                stringVariable(execution, "customerId"),
                monitoringDelivery != null ? monitoringDelivery.customerId() : null
        );
        String productId = firstNonBlank(orderSnapshot.productId(), stringVariable(execution, "productId"));
        String deliveryId = firstNonBlank(
                stringVariable(execution, "deliveredDeliveryId"),
                stringVariable(execution, "deliveryId"),
                monitoringDelivery != null ? monitoringDelivery.deliveryId() : null
        );

        OrderDto order = loadOrder(orderId, authorizationHeader);
        if (order != null) {
            customerId = firstNonBlank(order.customerId, customerId);
            productId = firstNonBlank(order.productId, productId);
        }

        DeliveryDetailDto delivery = loadDelivery(deliveryId, authorizationHeader);
        if (delivery != null) {
            customerId = firstNonBlank(delivery.userId, customerId);
            orderId = firstNonBlank(delivery.orderId, orderId);
            if (delivery.items != null && !delivery.items.isEmpty()) {
                productId = firstNonBlank(delivery.items.get(0).articleNumber, productId);
            }
        }

        UserDto user = loadUser(customerId, authorizationHeader);
        ArticleDto article = loadArticle(productId);

        return new EnrichmentContext(orderId, customerId, productId, orderSnapshot, order, user, article, delivery);
    }

    private DeliveryMonitoringItem monitoringDelivery(DelegateExecution execution) {
        Object delivery = execution.getVariable("delivery");
        return delivery instanceof DeliveryMonitoringItem monitoringDelivery ? monitoringDelivery : null;
    }

    private List<EnrichmentContext> loadAboConfirmationContexts(DelegateExecution execution) {
        List<String> orderIds = parseOrderIdsCsv(firstNonBlank(
                stringVariable(execution, "orderIdsCsv"),
                stringVariable(execution, "orderId")
        ));

        if (orderIds.isEmpty()) {
            return List.of();
        }

        return orderIds.stream()
                .map(orderId -> loadContext(execution, orderId))
                .toList();
    }

    private List<String> parseOrderIdsCsv(String orderIdsCsv) {
        if (isBlank(orderIdsCsv)) {
            return List.of();
        }

        List<String> orderIds = new java.util.ArrayList<>();
        for (String value : orderIdsCsv.split(",")) {
            String normalizedValue = value.trim();
            if (!normalizedValue.isBlank() && !orderIds.contains(normalizedValue)) {
                orderIds.add(normalizedValue);
            }
        }

        return orderIds;
    }

    private OrderSnapshot orderSnapshot(DelegateExecution execution, String orderId) {
        if (isBlank(orderId)) {
            return OrderSnapshot.empty();
        }

        Object snapshots = execution.getVariable("orderSnapshots");
        if (!(snapshots instanceof Map<?, ?> snapshotsMap)) {
            return OrderSnapshot.empty();
        }

        Object snapshot = snapshotsMap.get(orderId);
        if (!(snapshot instanceof Map<?, ?> snapshotMap)) {
            return OrderSnapshot.empty();
        }

        return new OrderSnapshot(
                stringValue(snapshotMap.get("customerId")),
                stringValue(snapshotMap.get("productId")),
                stringValue(snapshotMap.get("firstChangeType")),
                stringValue(snapshotMap.get("changeType")),
                stringValue(snapshotMap.get("status")),
                integerValue(snapshotMap.get("quantity")),
                integerValue(snapshotMap.get("interval"))
        );
    }

    private List<Map<String, Object>> buildAboOrderItems(DelegateExecution execution, List<EnrichmentContext> contexts) {
        return contexts.stream()
                .filter(context -> !isTransientCreatedThenCancelled(context))
                .map(context -> {
                    OrderDto order = context.order();
                    String productId = resolveProductIdForItem(context);
                    ArticleDto article = articleForProductId(context.article(), productId);
                    LocalDate deliveryDate = resolveDeliveryDate(context);

                    Map<String, Object> orderItem = new HashMap<>();
                    orderItem.put("name", firstNonBlank(article != null ? article.name : null, "Artikel " + productId));
                    orderItem.put("articleNumber", firstNonBlank(article != null ? article.productId : null, productId));
                    if (isCancelled(context)) {
                        orderItem.put("quantity", "Deabonniert");
                        orderItem.put("statusLabel", "Deabonniert");
                    } else {
                        orderItem.put("quantity", formatOrderItemQuantity(resolveQuantityForItem(context), article));
                        orderItem.put("intervalDescription", formatInterval(resolveIntervalForItem(context)));
                        orderItem.put("nextDeliveryDate", formatDate(deliveryDate));
                    }
                    return orderItem;
                })
                .toList();
    }

    private boolean isTransientCreatedThenCancelled(EnrichmentContext context) {
        return isCancelled(context) && "CREATED".equalsIgnoreCase(context.orderSnapshot().firstChangeType());
    }

    private boolean isCancelled(EnrichmentContext context) {
        OrderDto order = context.order();
        return "CANCELLED".equalsIgnoreCase(firstNonBlank(
                order != null ? order.status : null,
                context.orderSnapshot().status()
        ));
    }

    private String resolveProductIdForItem(EnrichmentContext context) {
        OrderDto order = context.order();
        return firstNonBlank(
                order != null ? order.productId : null,
                context.orderSnapshot().productId(),
                context.productId()
        );
    }

    private ArticleDto articleForProductId(ArticleDto article, String productId) {
        if (article != null && !isBlank(article.productId) && article.productId.equals(productId)) {
            return article;
        }

        return loadArticle(productId);
    }

    private OrderDto loadOrder(String orderId, String authorizationHeader) {
        if (isBlank(orderId)) {
            return null;
        }

        try {
            String url = trimTrailingSlash(ordersServiceBaseUrl) + "/orders/delivery/" + encode(orderId);
            ResponseEntity<OrderDto> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    httpEntity(authorizationHeader),
                    OrderDto.class
            );
            return response.getBody();
        } catch (RestClientException exception) {
            log.warn("Could not enrich mail data with order {}", orderId, exception);
            return null;
        }
    }

    private UserDto loadUser(String customerId, String authorizationHeader) {
        if (isBlank(customerId)) {
            return null;
        }

        UserDto customer = loadUserFromPath("customer", customerId, authorizationHeader);
        if (customer != null) {
            return customer;
        }

        customer = loadUserFromPath("customer/me", null, authorizationHeader);
        if (customer != null) {
            return customer;
        }

        return loadUserFromPath("customerForRestocker", customerId, authorizationHeader);
    }

    private UserDto loadUserFromPath(String path, String customerId, String authorizationHeader) {
        try {
            String url = trimTrailingSlash(usersServiceBaseUrl) + "/" + path;
            if (!isBlank(customerId)) {
                url += "?userId=" + encode(customerId);
            }
            ResponseEntity<UserDto> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    httpEntity(authorizationHeader),
                    UserDto.class
            );
            return response.getBody();
        } catch (RestClientException exception) {
            log.warn("Could not enrich mail data with customer {} via {}", customerId, path, exception);
            return null;
        }
    }

    private ArticleDto loadArticle(String productId) {
        if (isBlank(productId)) {
            return null;
        }

        try {
            String url = trimTrailingSlash(articlesServiceBaseUrl) + "/article?productId=" + encode(productId);
            return restTemplate.getForObject(url, ArticleDto.class);
        } catch (RestClientException exception) {
            log.warn("Could not enrich mail data with article {}", productId, exception);
            return null;
        }
    }

    private DeliveryDetailDto loadDelivery(String deliveryId, String authorizationHeader) {
        if (isBlank(deliveryId)) {
            return null;
        }

        try {
            String url = trimTrailingSlash(deliveriesServiceBaseUrl) + "/api/deliveries/" + encode(deliveryId) + "/detail";
            ResponseEntity<DeliveryDetailDto> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    httpEntity(authorizationHeader),
                    DeliveryDetailDto.class
            );
            return response.getBody();
        } catch (RestClientException exception) {
            log.warn("Could not enrich mail data with delivery {}", deliveryId, exception);
            return null;
        }
    }

    private HttpEntity<Void> httpEntity(String authorizationHeader) {
        HttpHeaders headers = new HttpHeaders();
        if (!isBlank(authorizationHeader)) {
            headers.set(HttpHeaders.AUTHORIZATION, authorizationHeader);
        }
        return new HttpEntity<>(headers);
    }

    private LocalDate resolveDeliveryDate(EnrichmentContext context) {
        LocalDate deliveryDate = parseDate(deliveryDeliveryDate(context.delivery()));
        if (deliveryDate != null) {
            return deliveryDate;
        }

        OrderDto order = context.order();
        UserDto user = context.user();
        LocalDate anchorDate = resolveOrderCreatedAt(order).toLocalDate();
        DayOfWeek deliveryDay = resolveDeliveryDay(user, order, anchorDate);
        LocalDate firstDeliveryDate = firstDateWithMinimumLeadTime(anchorDate, deliveryDay);
        int intervalWeeks = order != null && order.interval != null && order.interval > 0 ? order.interval : 1;

        LocalDate today = LocalDate.now();
        while (firstDeliveryDate.isBefore(today)) {
            firstDeliveryDate = firstDeliveryDate.plusWeeks(intervalWeeks);
        }

        return firstDeliveryDate;
    }

    private DayOfWeek resolveDeliveryDay(UserDto user, OrderDto order, LocalDate anchorDate) {
        DayOfWeek configuredDeliveryDay = parseDeliveryDay(user != null ? user.deliveryDay : null);
        if (configuredDeliveryDay != null) {
            return configuredDeliveryDay;
        }

        if (order != null && order.createdAt != null) {
            return order.createdAt.toLocalDate().getDayOfWeek();
        }

        return anchorDate.getDayOfWeek();
    }

    private DayOfWeek parseDeliveryDay(String deliveryDay) {
        if (isBlank(deliveryDay)) {
            return null;
        }

        return switch (deliveryDay.trim().toLowerCase(Locale.GERMAN)) {
            case "montag", "monday", "mo" -> DayOfWeek.MONDAY;
            case "dienstag", "tuesday", "di" -> DayOfWeek.TUESDAY;
            case "mittwoch", "wednesday", "mi" -> DayOfWeek.WEDNESDAY;
            case "donnerstag", "thursday", "do" -> DayOfWeek.THURSDAY;
            case "freitag", "friday", "fr" -> DayOfWeek.FRIDAY;
            case "samstag", "saturday", "sa" -> DayOfWeek.SATURDAY;
            case "sonntag", "sunday", "so" -> DayOfWeek.SUNDAY;
            default -> null;
        };
    }

    private LocalDate firstDateWithMinimumLeadTime(LocalDate anchorDate, DayOfWeek deliveryDay) {
        LocalDate deliveryDate = anchorDate;
        while (deliveryDate.getDayOfWeek() != deliveryDay) {
            deliveryDate = deliveryDate.plusDays(1);
        }

        while (completeWorkdaysBetween(anchorDate, deliveryDate) < 2) {
            deliveryDate = deliveryDate.plusWeeks(1);
        }

        return deliveryDate;
    }

    private int completeWorkdaysBetween(LocalDate startDate, LocalDate endDate) {
        int workdays = 0;
        LocalDate date = startDate.plusDays(1);
        while (date.isBefore(endDate)) {
            if (date.getDayOfWeek() != DayOfWeek.SATURDAY && date.getDayOfWeek() != DayOfWeek.SUNDAY) {
                workdays++;
            }
            date = date.plusDays(1);
        }
        return workdays;
    }

    private LocalDateTime resolveOrderCreatedAt(OrderDto order) {
        return order != null && order.createdAt != null ? order.createdAt : LocalDateTime.now();
    }

    private int resolveQuantity(DelegateExecution execution, OrderDto order) {
        Object variable = execution.getVariable("quantity");
        if (variable instanceof Number number) {
            return number.intValue();
        }
        if (variable instanceof String value && !value.isBlank()) {
            try {
                return Integer.parseInt(value.trim());
            } catch (NumberFormatException ignored) {
                return 1;
            }
        }
        return order != null && order.quantity != null ? order.quantity : 1;
    }

    private int resolveQuantityForItem(EnrichmentContext context) {
        OrderDto order = context.order();
        if (order != null && order.quantity != null) {
            return order.quantity;
        }

        Integer snapshotQuantity = context.orderSnapshot().quantity();
        return snapshotQuantity != null ? snapshotQuantity : 1;
    }

    private int resolveInterval(DelegateExecution execution, OrderDto order) {
        Object variable = execution.getVariable("interval");
        if (variable instanceof Number number) {
            return number.intValue();
        }
        if (variable instanceof String value && !value.isBlank()) {
            try {
                return Integer.parseInt(value.trim());
            } catch (NumberFormatException ignored) {
                return 1;
            }
        }
        return order != null && order.interval != null ? order.interval : 1;
    }

    private int resolveIntervalForItem(EnrichmentContext context) {
        OrderDto order = context.order();
        if (order != null && order.interval != null) {
            return order.interval;
        }

        Integer snapshotInterval = context.orderSnapshot().interval();
        return snapshotInterval != null ? snapshotInterval : 1;
    }

    private LocalDate parseDate(String value) {
        if (isBlank(value)) {
            return null;
        }

        String normalized = value.trim();
        try {
            return LocalDate.parse(normalized);
        } catch (DateTimeParseException ignored) {
            // Try date-time formats below.
        }

        try {
            return LocalDateTime.parse(normalized).toLocalDate();
        } catch (DateTimeParseException ignored) {
            // Try offset date-time below.
        }

        try {
            return OffsetDateTime.parse(normalized).toLocalDate();
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private String formatDate(LocalDate date) {
        return date.format(DISPLAY_DATE);
    }

    private String formatDateTime(LocalDateTime dateTime) {
        return dateTime
                .atZone(UTC)
                .withZoneSameInstant(BERLIN)
                .format(DISPLAY_DATE_TIME);
    }

    private String formatDayName(LocalDate date) {
        return date.getDayOfWeek().getDisplayName(java.time.format.TextStyle.FULL, GERMAN);
    }

    private String formatDeliveryWindow(String deliveryTime) {
        if (isBlank(deliveryTime)) {
            return "nach Absprache";
        }

        String normalized = deliveryTime.trim();
        if (normalized.toLowerCase(Locale.GERMAN).contains("uhr") || normalized.contains("-") || normalized.toLowerCase(Locale.GERMAN).contains("bis")) {
            return normalized;
        }

        try {
            LocalTime time = LocalTime.parse(normalized.length() == 5 ? normalized : normalized + ":00");
            return time.format(DateTimeFormatter.ofPattern("HH:mm")) + " Uhr";
        } catch (DateTimeParseException ignored) {
            return normalized;
        }
    }

    private String formatDeliveryLocation(DeliveryDetailDto delivery, UserDto user) {
        String street = firstNonBlank(deliveryStreet(delivery), user != null ? user.street : null);
        String houseNumber = firstNonBlank(deliveryHouseNumber(delivery), user != null ? user.houseNumber : null);
        String postalCode = firstNonBlank(deliveryPostalCode(delivery), user != null ? user.postalCode : null);
        String city = firstNonBlank(deliveryCity(delivery), user != null ? user.city : null);

        String streetLine = joinWithSpace(street, houseNumber);
        String cityLine = joinWithSpace(postalCode, city);
        return firstNonBlank(joinWithComma(streetLine, cityLine), userCompanyName(user), "Lieferadresse wird nachgereicht");
    }

    private String formatInterval(int intervalWeeks) {
        if (intervalWeeks <= 1) {
            return "Woechentlich";
        }
        return "Alle " + intervalWeeks + " Wochen";
    }

    private DeliveryItemDetailDto firstDeliveryItem(DeliveryDetailDto delivery) {
        if (delivery == null || delivery.items == null || delivery.items.isEmpty()) {
            return null;
        }
        return delivery.items.get(0);
    }

    private void setDeliveryItemsVariable(DelegateExecution execution, DeliveryDetailDto delivery) {
        if (delivery == null || delivery.items == null || delivery.items.isEmpty()) {
            return;
        }

        List<Map<String, Object>> deliveryItems = delivery.items.stream()
                .map(item -> {
                    Map<String, Object> deliveryItem = new HashMap<>();
                    deliveryItem.put("name", firstNonBlank(item.name, "Artikel " + item.articleNumber));
                    deliveryItem.put("articleNumber", item.articleNumber);
                    deliveryItem.put("quantity", formatDeliveryItemQuantity(item));
                    return deliveryItem;
                })
                .toList();
        execution.setVariable("deliveryItems", deliveryItems);
    }

    private String formatDeliveryItemQuantity(DeliveryItemDetailDto item) {
        if (item == null || item.quantity == null) {
            return null;
        }
        return joinWithSpace(String.valueOf(item.quantity), item.unit);
    }

    private String formatOrderItemQuantity(int quantity, ArticleDto article) {
        return joinWithSpace(String.valueOf(quantity), article != null ? article.unit : null);
    }

    private String formatOrderNumber(String orderId) {
        if (isBlank(orderId)) {
            return "RSO";
        }
        return orderId.startsWith("RSO-") ? orderId : "RSO-" + orderId;
    }

    private String stringVariable(DelegateExecution execution, String variableName) {
        Object value = execution.getVariable(variableName);
        return value != null ? String.valueOf(value) : null;
    }

    private String stringValue(Object value) {
        return value != null ? String.valueOf(value) : null;
    }

    private Integer integerValue(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }

        if (value instanceof String stringValue && !stringValue.isBlank()) {
            try {
                return Integer.parseInt(stringValue.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }

        return null;
    }

    private void setIfBlank(DelegateExecution execution, String variableName, String value) {
        if (!isBlank(stringVariable(execution, variableName)) || isBlank(value)) {
            return;
        }
        execution.setVariable(variableName, value);
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }

        for (String value : values) {
            if (!isBlank(value)) {
                return value.trim();
            }
        }
        return null;
    }

    private String joinWithSpace(String... values) {
        StringBuilder builder = new StringBuilder();
        for (String value : values) {
            if (isBlank(value)) {
                continue;
            }
            if (!builder.isEmpty()) {
                builder.append(' ');
            }
            builder.append(value.trim());
        }
        return builder.toString();
    }

    private String joinWithComma(String... values) {
        StringBuilder builder = new StringBuilder();
        for (String value : values) {
            if (isBlank(value)) {
                continue;
            }
            if (!builder.isEmpty()) {
                builder.append(", ");
            }
            builder.append(value.trim());
        }
        return builder.toString();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String trimTrailingSlash(String value) {
        if (value == null) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String orderId(OrderDto order) {
        return order != null && order.id != null ? String.valueOf(order.id) : null;
    }

    private String userEmail(UserDto user) {
        return user != null ? user.email : null;
    }

    private String userCompanyName(UserDto user) {
        return user != null ? user.companyName : null;
    }

    private String userDeliveryTime(UserDto user) {
        return user != null ? stringValue(user.deliveryTime) : null;
    }

    private String userDeliveryHint(UserDto user) {
        return user != null ? user.deliveryHint : null;
    }

    private String deliveryRecipientEmail(DeliveryDetailDto delivery) {
        return delivery != null ? delivery.recipientEmail : null;
    }

    private String deliveryCompanyName(DeliveryDetailDto delivery) {
        return delivery != null ? delivery.companyName : null;
    }

    private String deliveryOrderId(DeliveryDetailDto delivery) {
        return delivery != null ? delivery.orderId : null;
    }

    private String deliveryDeliveryDate(DeliveryDetailDto delivery) {
        return delivery != null ? delivery.deliveryDate : null;
    }

    private String deliveryDeliveryTime(DeliveryDetailDto delivery) {
        return delivery != null ? delivery.deliveryTime : null;
    }

    private String deliveryRestockerName(DeliveryDetailDto delivery) {
        return delivery != null ? delivery.restockerName : null;
    }

    private String restockerDisplayName(DeliveryDetailDto delivery) {
        String restockerName = deliveryRestockerName(delivery);
        if (isBlank(restockerName) || !restockerName.trim().contains(" ")) {
            return null;
        }

        return restockerName.trim();
    }

    private String deliveryStreet(DeliveryDetailDto delivery) {
        return delivery != null ? delivery.street : null;
    }

    private String deliveryHouseNumber(DeliveryDetailDto delivery) {
        return delivery != null ? delivery.houseNumber : null;
    }

    private String deliveryPostalCode(DeliveryDetailDto delivery) {
        return delivery != null ? delivery.postalCode : null;
    }

    private String deliveryCity(DeliveryDetailDto delivery) {
        return delivery != null ? delivery.city : null;
    }

    private record EnrichmentContext(
            String orderId,
            String customerId,
            String productId,
            OrderSnapshot orderSnapshot,
            OrderDto order,
            UserDto user,
            ArticleDto article,
            DeliveryDetailDto delivery
    ) {
    }

    private record OrderSnapshot(
            String customerId,
            String productId,
            String firstChangeType,
            String changeType,
            String status,
            Integer quantity,
            Integer interval
    ) {
        static OrderSnapshot empty() {
            return new OrderSnapshot(null, null, null, null, null, null, null);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OrderDto {
        public Long id;
        public String customerId;
        public String productId;
        public String status;
        public Integer quantity;
        public Integer interval;
        public LocalDateTime createdAt;
        public LocalDateTime updatedAt;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class UserDto {
        public String userId;
        @JsonAlias({"recipientEmail", "customerEmail", "mail"})
        public String email;
        public String postalCode;
        public String city;
        public String street;
        public String houseNumber;
        public String country;
        @JsonAlias({"customerName", "name"})
        public String companyName;
        public String phoneNumber;
        @JsonAlias({"contactPerson"})
        public String roleInCompany;
        public String deliveryHint;
        public String deliveryDay;
        public Object deliveryTime;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ArticleDto {
        public String productId;
        public String name;
        public String unit;
        public Integer unitCount;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DeliveryDetailDto {
        public String id;
        public String orderId;
        public String userId;
        public String recipientEmail;
        public String companyName;
        public String street;
        public String houseNumber;
        public String postalCode;
        public String city;
        public String deliveryHint;
        public String deliveryDay;
        public String deliveryTime;
        public String deliveryDate;
        public String restockerName;
        public java.util.List<DeliveryItemDetailDto> items;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DeliveryItemDetailDto {
        public String articleNumber;
        public String name;
        public Integer quantity;
        public String unit;
    }
}
