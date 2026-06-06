package de.restockoffice;

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
    private static final String DIV_CLOSE = "</div>";
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
        values.put(DELIVERY_WINDOW_KEY, escapeHtml(request.deliveryWindow()));
        values.put(DELIVERY_LOCATION_KEY, escapeHtml(request.deliveryLocation()));
        values.put("changeDeadline", escapeHtml(request.changeDeadline()));
        values.put(SUPPORT_EMAIL_KEY, escapeHtml(defaultIfBlank(request.supportEmail(), mailSettings.supportEmail())));
        values.put("manageSubscriptionUrl", SUBSCRIPTION_URL);
        values.put("orderItemsHtml", buildOrderItemsHtml(request.orderItems()));

        String subject = defaultIfBlank(request.subject(), "Abo-Bestellbestätigung " + request.orderNumber());
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
        values.put("deliveryDay", escapeHtml(request.deliveryDay()));
        values.put(DELIVERY_DATE_KEY, escapeHtml(request.deliveryDate()));
        values.put(DELIVERY_WINDOW_KEY, escapeHtml(request.deliveryWindow()));
        values.put(ORDER_NUMBER_KEY, escapeHtml(request.orderNumber()));
        values.put(SUPPLIER_NAME_KEY, escapeHtml(request.supplierName()));
        values.put(DELIVERY_LOCATION_KEY, escapeHtml(request.deliveryLocation()));
        values.put("deliveryInstructions", escapeHtml(request.deliveryInstructions()));
        values.put(SUPPORT_EMAIL_KEY, escapeHtml(defaultIfBlank(request.supportEmail(), mailSettings.supportEmail())));
        values.put("deliveryDetailsUrl", escapeHtml(defaultIfBlank(request.deliveryDetailsUrl(), "#")));
        values.put("deliveryItemsHtml", buildDeliveryItemsHtml(request.deliveryItems()));

        String subject = defaultIfBlank(request.subject(), "Deine ReStockOffice Lieferung kommt am " + request.deliveryDate());
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
        values.put(SUPPORT_EMAIL_KEY, escapeHtml(defaultIfBlank(request.supportEmail(), mailSettings.supportEmail())));
        values.put("deliveryDetailsUrl", escapeHtml(defaultIfBlank(request.deliveryDetailsUrl(), "#")));
        values.put("deliveryItemsHtml", buildDeliveryItemsHtml(request.deliveryItems()));

        String subject = defaultIfBlank(request.subject(), "Deine ReStockOffice Lieferung vom " + request.deliveryDate() + " ist angekommen");
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
            boolean isLast = index == items.size() - 1;
            html.append("<tr class=\"item-row\"><td class=\"item-main\" style=\"padding:14px 0;vertical-align:top;");
            if (!isLast) {
                html.append(ITEM_BORDER_STYLE);
            }
            html.append("\">")
                    .append("<div style=\"font-size:22px;line-height:1.2;font-weight:700;color:#264037;\">")
                    .append(escapeHtml(item.name()))
                    .append(DIV_CLOSE)
                    .append("<div style=\"padding-top:8px;font-size:14px;line-height:1.55;color:#5f726b;word-break:break-word;\">Artikel-Nr. ")
                    .append(escapeHtml(item.articleNumber()))
                    .append(DIV_CLOSE);
            if (!isBlank(item.statusLabel())) {
                html.append("<div style=\"font-size:14px;line-height:1.55;color:#5f726b;word-break:break-word;\">Status: ")
                        .append(escapeHtml(item.statusLabel()))
                        .append(DIV_CLOSE);
            } else {
                appendOptionalOrderItemLine(html, "Intervall", item.intervalDescription());
                appendOptionalOrderItemLine(html, "Nächste Lieferung", item.nextDeliveryDate());
            }
            html.append("</td><td align=\"right\" class=\"qty-cell\" style=\"width:98px;padding:14px 0 14px 16px;vertical-align:top;text-align:right;");
            if (!isLast) {
                html.append(ITEM_BORDER_STYLE);
            }
            html.append("\"><span class=\"qty-text\" style=\"display:inline-block;color:#264037;font-weight:700;font-size:18px;line-height:1.3;white-space:nowrap;\">")
                    .append(escapeHtml(item.quantity()))
                    .append("</span></td></tr>");
        }
        return html.toString();
    }

    private void appendOptionalOrderItemLine(StringBuilder html, String label, String value) {
        if (isBlank(value)) {
            return;
        }

        html.append("<div style=\"font-size:14px;line-height:1.55;color:#5f726b;word-break:break-word;\">")
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
            boolean isLast = index == items.size() - 1;
            html.append("<tr class=\"item-row\"><td class=\"item-main\" style=\"padding:14px 0;vertical-align:top;");
            if (!isLast) {
                html.append(ITEM_BORDER_STYLE);
            }
            html.append("\">")
                    .append("<div style=\"font-size:22px;line-height:1.2;font-weight:700;color:#264037;\">").append(escapeHtml(item.name())).append(DIV_CLOSE)
                    .append("<div style=\"padding-top:8px;font-size:14px;line-height:1.55;color:#5f726b;word-break:break-word;\">Artikel-Nr. ")
                    .append(escapeHtml(item.articleNumber()))
                    .append("</div></td><td align=\"right\" class=\"qty-cell\" style=\"width:98px;padding:14px 0 14px 16px;vertical-align:top;text-align:right;");
            if (!isLast) {
                html.append(ITEM_BORDER_STYLE);
            }
            html.append("\"><span class=\"qty-text\" style=\"display:inline-block;color:#264037;font-weight:700;font-size:18px;line-height:1.3;white-space:nowrap;\">")
                    .append(escapeHtml(item.quantity()))
                    .append("</span></td></tr>");
        }
        return html.toString();
    }

    private void validateAboConfirmation(AboConfirmationRequest request) {
        require(request != null, REQUEST_REQUIRED_MESSAGE);
        requireNotBlank(request.recipientEmail(), RECIPIENT_EMAIL_FIELD);
        requireNotBlank(request.customerName(), CUSTOMER_NAME_KEY);
        requireNotBlank(request.orderNumber(), ORDER_NUMBER_KEY);
        requireNotBlank(request.orderDate(), "orderDate");
        requireNotBlank(request.deliveryWindow(), DELIVERY_WINDOW_KEY);
        requireNotBlank(request.deliveryLocation(), DELIVERY_LOCATION_KEY);
        requireNotBlank(request.changeDeadline(), "changeDeadline");
    }

    private void validateDeliveryAnnouncement(DeliveryAnnouncementRequest request) {
        require(request != null, REQUEST_REQUIRED_MESSAGE);
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
        require(request != null, REQUEST_REQUIRED_MESSAGE);
        requireNotBlank(request.recipientEmail(), RECIPIENT_EMAIL_FIELD);
        requireNotBlank(request.customerName(), CUSTOMER_NAME_KEY);
        requireNotBlank(request.deliveryDate(), DELIVERY_DATE_KEY);
        requireNotBlank(request.deliveryWindow(), DELIVERY_WINDOW_KEY);
        requireNotBlank(request.orderNumber(), ORDER_NUMBER_KEY);
        requireNotBlank(request.supplierName(), SUPPLIER_NAME_KEY);
    }

    private void require(boolean expression, String message) {
        if (!expression) {
            throw new MailValidationException(message);
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
