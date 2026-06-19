package de.restockoffice.mails;

import de.restockoffice.deliveries.DeliveryAnnouncementRequest;
import de.restockoffice.deliveries.DeliveryConfirmationRequest;
import de.restockoffice.deliveries.DeliveryItem;
import de.restockoffice.subscriptions.AboConfirmationRequest;
import de.restockoffice.subscriptions.OrderItem;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@Path("/emails")
@Consumes(MediaType.APPLICATION_JSON)
public class MailResource {

    private static final String PREVIEW_LOGO_URL = "http://localhost:8080/assets/logo_colored.png";
    private static final String MAIL_STATUS_QUEUED = "queued";
    private static final String PREVIEW_RECIPIENT_EMAIL = "kunde@restockoffice.de";
    private static final String PREVIEW_CUSTOMER_NAME = "ReStockOffice Demo GmbH";
    private static final String PREVIEW_NEXT_DELIVERY_DATE = "11.05.2026";
    private static final Logger log = LoggerFactory.getLogger(MailResource.class);

    @Inject
    NotificationMailService notificationMailService;

    @POST
    @Path("/abo-confirmation")
    @Produces(MediaType.APPLICATION_JSON)
    public SendMailResponse sendAboConfirmation(AboConfirmationRequest request) {
        log.info("Sending abo confirmation to {}", request.recipientEmail());

        RenderedMail renderedMail = notificationMailService.renderAboConfirmation(request);
        String messageId = notificationMailService.sendAboConfirmation(request);

        log.info("Abo confirmation sent successfully - messageId={}, recipient={}",
                messageId, request.recipientEmail());

        return new SendMailResponse(
                "abo-confirmation",
                request.recipientEmail(),
                renderedMail.subject(),
                messageId,
                MAIL_STATUS_QUEUED);
    }

    @POST
    @Path("/abo-confirmation/preview")
    @Produces(MediaType.TEXT_HTML + ";charset=UTF-8")
    public String previewAboConfirmation(AboConfirmationRequest request) {
        return notificationMailService.renderAboConfirmation(request).html();
    }

    @GET
    @Path("/abo-confirmation/preview")
    @Produces(MediaType.TEXT_HTML + ";charset=UTF-8")
    public String previewAboConfirmationInBrowser() {
        return notificationMailService.renderAboConfirmation(exampleAboConfirmationRequest()).html();
    }

    @POST
    @Path("/delivery-announcement")
    @Produces(MediaType.APPLICATION_JSON)
    public SendMailResponse sendDeliveryAnnouncement(DeliveryAnnouncementRequest request) {
        log.info("Sending delivery announcement to {}", request.recipientEmail());

        RenderedMail renderedMail = notificationMailService.renderDeliveryAnnouncement(request);
        String messageId = notificationMailService.sendDeliveryAnnouncement(request);

        log.info("Delivery announcement sent successfully - messageId={}, recipient={}",
                messageId, request.recipientEmail());

        return new SendMailResponse(
                "delivery-announcement",
                request.recipientEmail(),
                renderedMail.subject(),
                messageId,
                MAIL_STATUS_QUEUED);
    }

    @POST
    @Path("/delivery-announcement/preview")
    @Produces(MediaType.TEXT_HTML + ";charset=UTF-8")
    public String previewDeliveryAnnouncement(DeliveryAnnouncementRequest request) {
        return notificationMailService.renderDeliveryAnnouncement(request).html();
    }

    @GET
    @Path("/delivery-announcement/preview")
    @Produces(MediaType.TEXT_HTML + ";charset=UTF-8")
    public String previewDeliveryAnnouncementInBrowser() {
        return notificationMailService.renderDeliveryAnnouncement(exampleDeliveryAnnouncementRequest()).html();
    }

    @POST
    @Path("/delivery-confirmation")
    @Produces(MediaType.APPLICATION_JSON)
    public SendMailResponse sendDeliveryConfirmation(DeliveryConfirmationRequest request) {
        log.info("Sending delivery confirmation to {}", request.recipientEmail());

        RenderedMail renderedMail = notificationMailService.renderDeliveryConfirmation(request);
        String messageId = notificationMailService.sendDeliveryConfirmation(request);

        log.info("Delivery confirmation sent successfully - messageId={}, recipient={}",
                messageId, request.recipientEmail());

        return new SendMailResponse(
                "delivery-confirmation",
                request.recipientEmail(),
                renderedMail.subject(),
                messageId,
                MAIL_STATUS_QUEUED);
    }

    @POST
    @Path("/delivery-confirmation/preview")
    @Produces(MediaType.TEXT_HTML + ";charset=UTF-8")
    public String previewDeliveryConfirmation(DeliveryConfirmationRequest request) {
        return notificationMailService.renderDeliveryConfirmation(request).html();
    }

    @GET
    @Path("/delivery-confirmation/preview")
    @Produces(MediaType.TEXT_HTML + ";charset=UTF-8")
    public String previewDeliveryConfirmationInBrowser() {
        return notificationMailService.renderDeliveryConfirmation(exampleDeliveryConfirmationRequest()).html();
    }

    private AboConfirmationRequest exampleAboConfirmationRequest() {
        return new AboConfirmationRequest(
                PREVIEW_RECIPIENT_EMAIL,
                PREVIEW_CUSTOMER_NAME,
                "RSO-DEMO-0042",
                "04.05.2026",
                "Montag",
                "Montag, 11.05.2026 zwischen 08:00 und 12:00 Uhr",
                "Buerostrasse 12, 85049 Ingolstadt",
                "08.05.2026, 12:00 Uhr",
                null,
                "https://app.restockoffice.de/subscription",
                PREVIEW_LOGO_URL,
                null,
                List.of(
                        new OrderItem("Druckerpapier A4", "10001", "12", "Alle 2 Wochen", PREVIEW_NEXT_DELIVERY_DATE, null),
                        new OrderItem("Kugelschreiber Blau", "10002", "6", "Monatlich", PREVIEW_NEXT_DELIVERY_DATE, null),
                        new OrderItem("Notizblock kariert", "10003", "8", "Alle 4 Wochen", PREVIEW_NEXT_DELIVERY_DATE, null)
                )
        );
    }

    private DeliveryAnnouncementRequest exampleDeliveryAnnouncementRequest() {
        return new DeliveryAnnouncementRequest(
                PREVIEW_RECIPIENT_EMAIL,
                PREVIEW_CUSTOMER_NAME,
                "2",
                "Mittwoch",
                "06.05.2026",
                "Mittwoch, 06.05.2026 zwischen 09:00 und 11:00 Uhr",
                "RSO-DEMO-0042",
                "ReStockOffice Restocker",
                "Buerostrasse 12, 85049 Ingolstadt",
                "Bitte am Empfang abgeben.",
                null,
                "https://app.restockoffice.de/restocker/deliveries",
                PREVIEW_LOGO_URL,
                null,
                List.of(
                        new DeliveryItem("Druckerpapier A4", "10001", "12"),
                        new DeliveryItem("Kugelschreiber Blau", "10002", "6"),
                        new DeliveryItem("Notizblock kariert", "10003", "8")
                )
        );
    }

    private DeliveryConfirmationRequest exampleDeliveryConfirmationRequest() {
        return new DeliveryConfirmationRequest(
                PREVIEW_RECIPIENT_EMAIL,
                PREVIEW_CUSTOMER_NAME,
                "Freitag, 15.05.2026",
                "um 15:30 Uhr",
                "RSO-DEMO-0042",
                "ReStockOffice Restocker",
                null,
                "https://app.restockoffice.de/restocker/deliveries",
                PREVIEW_LOGO_URL,
                null,
                List.of(
                        new DeliveryItem("Druckerpapier A4", "10001", "4 Pack"),
                        new DeliveryItem("Kugelschreiber Blau", "10002", "2 Kartons"),
                        new DeliveryItem("Notizblock kariert", "10003", "12 Stk")
                )
        );
    }
}
