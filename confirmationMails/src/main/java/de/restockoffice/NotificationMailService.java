package de.restockoffice;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@ApplicationScoped
public class NotificationMailService {

    private static final String ORDER_TEMPLATE = "templates/order-confirmation.html";
    private static final String DELIVERY_TEMPLATE = "templates/delivery-announcement.html";

    @Inject
    TemplateService templateService;

    @Inject
    ResendMailClient resendMailClient;

    @Inject
    MailSettings mailSettings;

    public RenderedMail renderOrderConfirmation(OrderConfirmationRequest request) {
        validateOrderConfirmation(request);

        Map<String, String> values = new LinkedHashMap<>();
        values.put("inlineStyles", templateService.loadStyles());
        values.put("logoUrl", escapeHtml(defaultIfBlank(request.logoUrl(), mailSettings.logoUrl())));
        values.put("customerName", escapeHtml(request.customerName()));
        values.put("orderNumber", escapeHtml(request.orderNumber()));
        values.put("orderDate", escapeHtml(request.orderDate()));
        values.put("orderedBy", escapeHtml(request.orderedBy()));
        values.put("deliveryWindow", escapeHtml(request.deliveryWindow()));
        values.put("officeLocation", escapeHtml(request.officeLocation()));
        values.put("deliveryLocation", escapeHtml(request.deliveryLocation()));
        values.put("deskDetails", escapeHtml(request.deskDetails()));
        values.put("onSiteContact", escapeHtml(request.onSiteContact()));
        values.put("changeDeadline", escapeHtml(request.changeDeadline()));
        values.put("supportEmail", escapeHtml(defaultIfBlank(request.supportEmail(), mailSettings.supportEmail())));
        values.put("manageSubscriptionUrl", escapeHtml(defaultIfBlank(request.manageSubscriptionUrl(), "#")));
        values.put("orderItemsHtml", buildOrderItemsHtml(request.orderItems()));

        String subject = defaultIfBlank(request.subject(), "Deine ReStockOrder " + request.orderNumber() + " wurde bestätigt");
        return new RenderedMail(subject, templateService.render(ORDER_TEMPLATE, values));
    }

    public RenderedMail renderDeliveryAnnouncement(DeliveryAnnouncementRequest request) {
        validateDeliveryAnnouncement(request);

        Map<String, String> values = new LinkedHashMap<>();
        values.put("inlineStyles", templateService.loadStyles());
        values.put("logoUrl", escapeHtml(defaultIfBlank(request.logoUrl(), mailSettings.logoUrl())));
        values.put("customerName", escapeHtml(request.customerName()));
        values.put("daysUntilDelivery", escapeHtml(request.daysUntilDelivery()));
        values.put("deliveryDate", escapeHtml(request.deliveryDate()));
        values.put("deliveryWindow", escapeHtml(request.deliveryWindow()));
        values.put("officeLocation", escapeHtml(request.officeLocation()));
        values.put("orderNumber", escapeHtml(request.orderNumber()));
        values.put("supplierName", escapeHtml(request.supplierName()));
        values.put("deliveryLocation", escapeHtml(request.deliveryLocation()));
        values.put("deskDetails", escapeHtml(request.deskDetails()));
        values.put("onSiteContact", escapeHtml(request.onSiteContact()));
        values.put("deliveryInstructions", escapeHtml(request.deliveryInstructions()));
        values.put("supportEmail", escapeHtml(defaultIfBlank(request.supportEmail(), mailSettings.supportEmail())));
        values.put("deliveryDetailsUrl", escapeHtml(defaultIfBlank(request.deliveryDetailsUrl(), "#")));
        values.put("deliveryItemsHtml", buildDeliveryItemsHtml(request.deliveryItems()));

        String subject = defaultIfBlank(request.subject(), "Deine ReStockOffice Lieferung kommt am " + request.deliveryDate());
        return new RenderedMail(subject, templateService.render(DELIVERY_TEMPLATE, values));
    }

    public String sendOrderConfirmation(OrderConfirmationRequest request) {
        RenderedMail renderedMail = renderOrderConfirmation(request);
        return resendMailClient.send(request.recipientEmail(), renderedMail.subject(), renderedMail.html());
    }

    public String sendDeliveryAnnouncement(DeliveryAnnouncementRequest request) {
        RenderedMail renderedMail = renderDeliveryAnnouncement(request);
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
            html.append("<tr><td style=\"padding: 14px 0;");
            if (!isLast) {
                html.append(" border-bottom: 1px solid #e3ebe5;");
            }
            html.append("\">")
                    .append("<div class=\"email-item-title\">").append(escapeHtml(item.name())).append("</div>")
                    .append("<div class=\"email-item-copy\">Artikel-Nr. ")
                    .append(escapeHtml(item.articleNumber()))
                    .append(" - Intervall: ")
                    .append(escapeHtml(item.intervalDescription()))
                    .append(" - Nächste Lieferung: ")
                    .append(escapeHtml(item.nextDeliveryDate()))
                    .append("</div></td><td align=\"right\" style=\"padding: 14px 0;");
            if (!isLast) {
                html.append(" border-bottom: 1px solid #e3ebe5;");
            }
            html.append(" font-size: 15px; color: #1f2a2e;\">")
                    .append(escapeHtml(item.quantity()))
                    .append("</td></tr>");
        }
        return html.toString();
    }

    private String buildDeliveryItemsHtml(List<DeliveryItem> items) {
        if (items == null || items.isEmpty()) {
            throw new MailValidationException("deliveryItems must not be empty");
        }
        StringBuilder html = new StringBuilder();
        for (int index = 0; index < items.size(); index++) {
            DeliveryItem item = Objects.requireNonNull(items.get(index), "deliveryItems contains null");
            boolean isLast = index == items.size() - 1;
            html.append("<tr><td style=\"padding: 14px 0;");
            if (!isLast) {
                html.append(" border-bottom: 1px solid #e3ebe5;");
            }
            html.append("\">")
                    .append("<div class=\"email-item-title\">").append(escapeHtml(item.name())).append("</div>")
                    .append("<div class=\"email-item-copy\">Artikel-Nr. ")
                    .append(escapeHtml(item.articleNumber()))
                    .append("</div></td><td align=\"right\" style=\"padding: 14px 0;");
            if (!isLast) {
                html.append(" border-bottom: 1px solid #e3ebe5;");
            }
            html.append(" font-size: 15px; color: #1f2a2e;\">")
                    .append(escapeHtml(item.quantity()))
                    .append("</td></tr>");
        }
        return html.toString();
    }

    private void validateOrderConfirmation(OrderConfirmationRequest request) {
        require(request != null, "request must not be null");
        requireNotBlank(request.recipientEmail(), "recipientEmail");
        requireNotBlank(request.customerName(), "customerName");
        requireNotBlank(request.orderNumber(), "orderNumber");
        requireNotBlank(request.orderDate(), "orderDate");
        requireNotBlank(request.orderedBy(), "orderedBy");
        requireNotBlank(request.deliveryWindow(), "deliveryWindow");
        requireNotBlank(request.officeLocation(), "officeLocation");
        requireNotBlank(request.deliveryLocation(), "deliveryLocation");
        requireNotBlank(request.deskDetails(), "deskDetails");
        requireNotBlank(request.onSiteContact(), "onSiteContact");
        requireNotBlank(request.changeDeadline(), "changeDeadline");
    }

    private void validateDeliveryAnnouncement(DeliveryAnnouncementRequest request) {
        require(request != null, "request must not be null");
        requireNotBlank(request.recipientEmail(), "recipientEmail");
        requireNotBlank(request.customerName(), "customerName");
        requireNotBlank(request.daysUntilDelivery(), "daysUntilDelivery");
        requireNotBlank(request.deliveryDate(), "deliveryDate");
        requireNotBlank(request.deliveryWindow(), "deliveryWindow");
        requireNotBlank(request.officeLocation(), "officeLocation");
        requireNotBlank(request.orderNumber(), "orderNumber");
        requireNotBlank(request.supplierName(), "supplierName");
        requireNotBlank(request.deliveryLocation(), "deliveryLocation");
        requireNotBlank(request.deskDetails(), "deskDetails");
        requireNotBlank(request.onSiteContact(), "onSiteContact");
        requireNotBlank(request.deliveryInstructions(), "deliveryInstructions");
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
        return value == null || value.isBlank() ? fallback : value;
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
