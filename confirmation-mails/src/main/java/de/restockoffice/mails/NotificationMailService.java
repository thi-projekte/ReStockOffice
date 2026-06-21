package de.restockoffice.mails;

import de.restockoffice.deliveries.DeliveryAnnouncementRequest;
import de.restockoffice.deliveries.DeliveryConfirmationRequest;
import de.restockoffice.deliveries.DeliveryItem;
import de.restockoffice.subscriptions.AboConfirmationRequest;
import de.restockoffice.subscriptions.OrderItem;
import de.restockoffice.validation.MailValidationException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@ApplicationScoped
public class NotificationMailService {

    private static final String ABO_TEMPLATE = "templates/abo-confirmation.html";
    private static final String DELIVERY_TEMPLATE = "templates/delivery-announcement.html";
    private static final String DELIVERY_CONFIRMATION_TEMPLATE = "templates/delivery-confirmation.html";
    private static final String SUBSCRIPTION_URL = "https://app.restockoffice.de/subscription";
    private static final String INLINE_LOGO_URL = "cid:restockoffice-logo";

    private static final String LOGO_URL_KEY = "logoUrl";
    private static final String CUSTOMER_NAME_KEY = "customerName";
    private static final String ORDER_NUMBER_KEY = "orderNumber";
    private static final String DELIVERY_WINDOW_KEY = "deliveryWindow";
    private static final String DELIVERY_LOCATION_KEY = "deliveryLocation";
    private static final String SUPPORT_EMAIL_KEY = "supportEmail";
    private static final String DELIVERY_DATE_KEY = "deliveryDate";
    private static final String SUPPLIER_NAME_KEY = "supplierName";

    private static final String ITEM_BORDER_STYLE = "border-bottom:1px solid #e3ebe5;";
    private static final String MUTED_ITEM_TEXT_STYLE = "color:#5f726b;word-break:break-word;\">";
    private static final String DIV_CLOSE = "</div>";
    private static final String TABLE_CELL_CLOSE = "</td>";
    private static final String REQUEST_REQUIRED_MESSAGE = "request must not be null";
    private static final String RECIPIENT_EMAIL_FIELD = "recipientEmail";

    @Inject
    TemplateService templateService;

    @Inject
    ResendMailClient resendMailClient;

    @Inject
    MailSettings mailSettings;

    public RenderedMail renderAboConfirmation(AboConfirmationRequest request) {
        validateAboConfirmation(request);
        return renderAboConfirmation(request, defaultIfBlank(request.logoUrl(), mailSettings.logoUrl()));
    }

    private RenderedMail renderAboConfirmation(AboConfirmationRequest request, String logoUrl) {
        validateAboConfirmation(request);

        Map<String, String> values = new LinkedHashMap<>();
        values.put(LOGO_URL_KEY, escapeHtml(logoUrl));
        values.put(CUSTOMER_NAME_KEY, escapeHtml(request.customerName()));
        values.put(ORDER_NUMBER_KEY, escapeHtml(request.orderNumber()));
        values.put("orderDate", escapeHtml(request.orderDate()));
        values.put("deliveryDay", escapeHtml(defaultIfBlank(request.deliveryDay(), request.deliveryWindow())));
        values.put(DELIVERY_WINDOW_KEY, escapeHtml(request.deliveryWindow()));
        values.put(DELIVERY_LOCATION_KEY, escapeHtml(request.deliveryLocation()));
        values.put("changeDeadline", escapeHtml(request.changeDeadline()));
        values.put(
                SUPPORT_EMAIL_KEY,
                escapeHtml(defaultIfBlank(request.supportEmail(), mailSettings.supportEmail())));
        values.put("manageSubscriptionUrl", SUBSCRIPTION_URL);
        values.put("orderItemsHtml", buildOrderItemsHtml(request.orderItems()));

        String subject = defaultIfBlank(
                request.subject(),
                "Abo-Bestellbestätigung " + request.orderNumber()
        );

        return new RenderedMail(subject, templateService.render(ABO_TEMPLATE, values));
    }

    public RenderedMail renderDeliveryAnnouncement(DeliveryAnnouncementRequest request) {
        validateDeliveryAnnouncement(request);
        return renderDeliveryAnnouncement(request, defaultIfBlank(request.logoUrl(), mailSettings.logoUrl()));
    }

    private RenderedMail renderDeliveryAnnouncement(DeliveryAnnouncementRequest request, String logoUrl) {
        validateDeliveryAnnouncement(request);

        Map<String, String> values = new LinkedHashMap<>();
        values.put(LOGO_URL_KEY, escapeHtml(logoUrl));
        values.put(CUSTOMER_NAME_KEY, escapeHtml(request.customerName()));
        values.put("daysUntilDelivery", escapeHtml(request.daysUntilDelivery()));
        values.put("deliveryHeadline", escapeHtml(deliveryHeadline(request.daysUntilDelivery())));
        values.put("deliveryDay", escapeHtml(request.deliveryDay()));
        values.put(DELIVERY_DATE_KEY, escapeHtml(request.deliveryDate()));
        values.put(DELIVERY_WINDOW_KEY, escapeHtml(request.deliveryWindow()));
        values.put(ORDER_NUMBER_KEY, escapeHtml(request.orderNumber()));
        values.put(SUPPLIER_NAME_KEY, escapeHtml(request.supplierName()));
        values.put(DELIVERY_LOCATION_KEY, escapeHtml(request.deliveryLocation()));
        values.put("deliveryInstructions", escapeHtml(request.deliveryInstructions()));
        values.put(
                SUPPORT_EMAIL_KEY,
                escapeHtml(defaultIfBlank(request.supportEmail(), mailSettings.supportEmail()))
        );
        values.put("deliveryDetailsUrl", escapeHtml(defaultIfBlank(request.deliveryDetailsUrl(), "#")));
        values.put("deliveryItemsHtml", buildDeliveryItemsHtml(request.deliveryItems()));

        String subject = defaultIfBlank(
                request.subject(),
                "Deine ReStockOffice Lieferung kommt am " + request.deliveryDate()
        );

        return new RenderedMail(subject, templateService.render(DELIVERY_TEMPLATE, values));
    }

    public RenderedMail renderDeliveryConfirmation(DeliveryConfirmationRequest request) {
        validateDeliveryConfirmation(request);
        return renderDeliveryConfirmation(request, defaultIfBlank(request.logoUrl(), mailSettings.logoUrl()));
    }

    private RenderedMail renderDeliveryConfirmation(DeliveryConfirmationRequest request, String logoUrl) {
        validateDeliveryConfirmation(request);

        Map<String, String> values = new LinkedHashMap<>();
        values.put(LOGO_URL_KEY, escapeHtml(logoUrl));
        values.put(CUSTOMER_NAME_KEY, escapeHtml(request.customerName()));
        values.put(DELIVERY_DATE_KEY, escapeHtml(request.deliveryDate()));
        values.put(DELIVERY_WINDOW_KEY, escapeHtml(request.deliveryWindow()));
        values.put(ORDER_NUMBER_KEY, escapeHtml(request.orderNumber()));
        values.put(SUPPLIER_NAME_KEY, escapeHtml(request.supplierName()));
        values.put(
                SUPPORT_EMAIL_KEY,
                escapeHtml(defaultIfBlank(request.supportEmail(), mailSettings.supportEmail()))
        );
        values.put("deliveryDetailsUrl", escapeHtml(defaultIfBlank(request.deliveryDetailsUrl(), "#")));
        values.put("deliveryItemsHtml", buildDeliveryItemsHtml(request.deliveryItems()));

        String subject = defaultIfBlank(
                request.subject(),
                "Deine ReStockOffice Lieferung vom " + request.deliveryDate() + " ist angekommen"
        );

        return new RenderedMail(subject, templateService.render(DELIVERY_CONFIRMATION_TEMPLATE, values));
    }

    public String sendAboConfirmation(AboConfirmationRequest request) {
        RenderedMail renderedMail = renderAboConfirmation(request, INLINE_LOGO_URL);
        return resendMailClient.send(request.recipientEmail(), renderedMail.subject(), renderedMail.html());
    }

    public String sendDeliveryAnnouncement(DeliveryAnnouncementRequest request) {
        RenderedMail renderedMail = renderDeliveryAnnouncement(request, INLINE_LOGO_URL);
        return resendMailClient.send(request.recipientEmail(), renderedMail.subject(), renderedMail.html());
    }

    public String sendDeliveryConfirmation(DeliveryConfirmationRequest request) {
        RenderedMail renderedMail = renderDeliveryConfirmation(request, INLINE_LOGO_URL);
        return resendMailClient.send(request.recipientEmail(), renderedMail.subject(), renderedMail.html());
    }

    private String buildOrderItemsHtml(List<OrderItem> items) {
        if (items == null || items.isEmpty()) {
            throw new MailValidationException("orderItems must not be empty");
        }

        StringBuilder html = new StringBuilder();
        for (int index = 0; index < items.size(); index++) {
            OrderItem item = Objects.requireNonNull(items.get(index), "orderItems contains null");
            appendOrderItemRow(html, item, index == items.size() - 1);
        }

        return html.toString();
    }

    private void appendOrderItemRow(StringBuilder html, OrderItem item, boolean isLast) {
        appendItemDescriptionCell(html, isLast, item.name(), item.articleNumber());
        appendOrderItemDetails(html, item);
        appendItemQuantityCell(html, isLast, item.quantity());
    }

    private void appendOrderItemDetails(StringBuilder html, OrderItem item) {
        if (!isBlank(item.statusLabel())) {
            html.append("<div style=\"font-size:14px;line-height:1.55;")
                    .append(MUTED_ITEM_TEXT_STYLE)
                    .append("Status: ")
                    .append(escapeHtml(item.statusLabel()))
                    .append(DIV_CLOSE);
            return;
        }

        appendOptionalOrderItemLine(html, "Intervall", item.intervalDescription());
        appendOptionalOrderItemLine(html, "Nächste Lieferung", item.nextDeliveryDate());
    }

    private String formatQuantityAsMultiplier(String quantity) {
        String normalizedQuantity = quantity == null ? "" : quantity.trim();
        if (normalizedQuantity.isEmpty()) {
            return "";
        }

        String numericPrefix = normalizedQuantity.split("\\s+", 2)[0];
        if (!numericPrefix.matches("\\d+")) {
            return normalizedQuantity;
        }
        return numericPrefix.endsWith("x") ? numericPrefix : numericPrefix + "x";
    }

    private String deliveryHeadline(String daysUntilDelivery) {
        String normalizedDays = daysUntilDelivery == null ? "" : daysUntilDelivery.trim();
        if ("0".equals(normalizedDays)) {
            return "Deine Lieferung kommt heute an.";
        }
        if ("1".equals(normalizedDays)) {
            return "Deine Lieferung kommt morgen an.";
        }
        return "Deine Lieferung kommt in " + normalizedDays + " Tagen.";
    }


    private void appendOptionalOrderItemLine(StringBuilder html, String label, String value) {
        if (isBlank(value)) {
            return;
        }

        html.append("<div style=\"font-size:14px;line-height:1.55;")
                .append(MUTED_ITEM_TEXT_STYLE)
                .append(escapeHtml(label))
                .append(": ")
                .append(escapeHtml(value))
                .append(DIV_CLOSE);
    }

    private String buildDeliveryItemsHtml(List<DeliveryItem> items) {
        if (items == null || items.isEmpty()) {
            throw new MailValidationException("deliveryItems must not be empty");
        }

        StringBuilder html = new StringBuilder();
        for (int index = 0; index < items.size(); index++) {
            DeliveryItem item = Objects.requireNonNull(items.get(index), "deliveryItems contains null");
            appendItemDescriptionCell(html, index == items.size() - 1, item.name(), item.articleNumber());
            appendItemQuantityCell(html, index == items.size() - 1, item.quantity());
        }

        return html.toString();
    }

    private void appendItemDescriptionCell(
            StringBuilder html,
            boolean isLast,
            String itemName,
            String articleNumber
    ) {
        html.append("<tr class=\"item-row\">")
                .append("<td class=\"item-main\" style=\"padding:14px 0;vertical-align:top;");
        appendItemBorderStyle(html, isLast);
        html.append("\">")
                .append("<div style=\"font-size:22px;line-height:1.2;font-weight:700;color:#264037;\">")
                .append(escapeHtml(itemName))
                .append(DIV_CLOSE)
                .append("<div style=\"padding-top:8px;font-size:14px;line-height:1.55;")
                .append(MUTED_ITEM_TEXT_STYLE)
                .append("Artikel-Nr. ")
                .append(escapeHtml(articleNumber))
                .append(DIV_CLOSE);
    }

    private void appendItemQuantityCell(StringBuilder html, boolean isLast, String quantity) {
        html.append(TABLE_CELL_CLOSE)
                .append("<td align=\"right\" class=\"qty-cell\" ")
                .append("style=\"width:98px;padding:14px 0 14px 16px;")
                .append("vertical-align:top;text-align:right;");
        appendItemBorderStyle(html, isLast);
        html.append("\">")
                .append("<span class=\"qty-text\" ")
                .append("style=\"display:inline-block;color:#264037;font-weight:700;")
                .append("font-size:18px;line-height:1.3;white-space:nowrap;\">")
                .append(escapeHtml(formatQuantityAsMultiplier(quantity)))
                .append("</span>")
                .append(TABLE_CELL_CLOSE)
                .append("</tr>");
    }

    private void appendItemBorderStyle(StringBuilder html, boolean isLast) {
        if (!isLast) {
            html.append(ITEM_BORDER_STYLE);
        }
    }


    private void validateAboConfirmation(AboConfirmationRequest request) {
        requireRequest(request);
        requireNotBlank(request.recipientEmail(), RECIPIENT_EMAIL_FIELD);
        requireNotBlank(request.customerName(), CUSTOMER_NAME_KEY);
        requireNotBlank(request.orderNumber(), ORDER_NUMBER_KEY);
        requireNotBlank(request.orderDate(), "orderDate");
        requireNotBlank(request.deliveryWindow(), DELIVERY_WINDOW_KEY);
        requireNotBlank(request.deliveryLocation(), DELIVERY_LOCATION_KEY);
        requireNotBlank(request.changeDeadline(), "changeDeadline");
    }

    private void validateDeliveryAnnouncement(DeliveryAnnouncementRequest request) {
        requireRequest(request);
        requireNotBlank(request.recipientEmail(), RECIPIENT_EMAIL_FIELD);
        requireNotBlank(request.customerName(), CUSTOMER_NAME_KEY);
        requireNotBlank(request.daysUntilDelivery(), "daysUntilDelivery");
        requireNotBlank(request.deliveryDay(), "deliveryDay");
        requireNotBlank(request.deliveryDate(), DELIVERY_DATE_KEY);
        requireNotBlank(request.deliveryWindow(), DELIVERY_WINDOW_KEY);
        requireNotBlank(request.orderNumber(), ORDER_NUMBER_KEY);
        requireNotBlank(request.supplierName(), SUPPLIER_NAME_KEY);
        requireNotBlank(request.deliveryLocation(), DELIVERY_LOCATION_KEY);
        requireNotBlank(request.deliveryInstructions(), "deliveryInstructions");
    }

    private void validateDeliveryConfirmation(DeliveryConfirmationRequest request) {
        requireRequest(request);
        requireNotBlank(request.recipientEmail(), RECIPIENT_EMAIL_FIELD);
        requireNotBlank(request.customerName(), CUSTOMER_NAME_KEY);
        requireNotBlank(request.deliveryDate(), DELIVERY_DATE_KEY);
        requireNotBlank(request.deliveryWindow(), DELIVERY_WINDOW_KEY);
        requireNotBlank(request.orderNumber(), ORDER_NUMBER_KEY);
        requireNotBlank(request.supplierName(), SUPPLIER_NAME_KEY);
    }

    private void requireRequest(Object request) {
        if (request == null) {
            throw new MailValidationException(REQUEST_REQUIRED_MESSAGE);
        }
    }

    private void requireNotBlank(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new MailValidationException(fieldName + " must not be blank");
        }
    }

    private String defaultIfBlank(String value, String fallback) {
        return isBlank(value) ? fallback : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String escapeHtml(String value) {
        String safeValue = value == null ? "" : value;
        return safeValue.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
