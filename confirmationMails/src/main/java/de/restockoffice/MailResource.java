package de.restockoffice;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.List;

@Path("/emails")
@Consumes(MediaType.APPLICATION_JSON)
public class MailResource {

    private static final String PREVIEW_LOGO_URL = "http://localhost:8080/assets/logo_colored.png";

    @Inject
    NotificationMailService notificationMailService;

    @POST
    @Path("/order-confirmation")
    @Produces(MediaType.APPLICATION_JSON)
    public SendMailResponse sendOrderConfirmation(OrderConfirmationRequest request) {
        RenderedMail renderedMail = notificationMailService.renderOrderConfirmation(request);
        String messageId = notificationMailService.sendOrderConfirmation(request);
        return new SendMailResponse("order-confirmation", request.recipientEmail(), renderedMail.subject(), messageId, "queued");
    }

    @POST
    @Path("/order-confirmation/preview")
    @Produces(MediaType.TEXT_HTML + ";charset=UTF-8")
    public String previewOrderConfirmation(OrderConfirmationRequest request) {
        return notificationMailService.renderOrderConfirmation(request).html();
    }

    @GET
    @Path("/order-confirmation/preview")
    @Produces(MediaType.TEXT_HTML + ";charset=UTF-8")
    public String previewOrderConfirmationInBrowser() {
        return notificationMailService.renderOrderConfirmation(exampleOrderConfirmationRequest()).html();
    }

    @POST
    @Path("/delivery-announcement")
    @Produces(MediaType.APPLICATION_JSON)
    public SendMailResponse sendDeliveryAnnouncement(DeliveryAnnouncementRequest request) {
        RenderedMail renderedMail = notificationMailService.renderDeliveryAnnouncement(request);
        String messageId = notificationMailService.sendDeliveryAnnouncement(request);
        return new SendMailResponse("delivery-announcement", request.recipientEmail(), renderedMail.subject(), messageId, "queued");
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

    private OrderConfirmationRequest exampleOrderConfirmationRequest() {
        return new OrderConfirmationRequest(
                "max.mustermann@example.com",
                "Max Mustermann",
                "RSO-2026-0042",
                "04.05.2026",
                "Julia Becker",
                "Montag, 11.05.2026 zwischen 08:00 und 12:00 Uhr",
                "Berlin HQ",
                "3. OG, Kueche Nord",
                "Ablage links neben dem Kaffeevollautomaten",
                "Nina Schulz, +49 30 123456",
                "08.05.2026, 12:00 Uhr",
                null,
                "https://restockoffice.de/subscription/manage/rso-2026-0042",
                PREVIEW_LOGO_URL,
                null,
                List.of(
                        new OrderItem("Haferdrink Barista", "HD-2048", "12", "Alle 2 Wochen", "11.05.2026"),
                        new OrderItem("Kaffeebohnen House Blend", "KB-1102", "6", "Monatlich", "11.05.2026"),
                        new OrderItem("Bio Tee Mix", "TM-7781", "8", "Alle 4 Wochen", "11.05.2026")
                )
        );
    }

    private DeliveryAnnouncementRequest exampleDeliveryAnnouncementRequest() {
        return new DeliveryAnnouncementRequest(
                "max.mustermann@example.com",
                "Max Mustermann",
                "2",
                "06.05.2026",
                "Mittwoch, 06.05.2026 zwischen 09:00 und 11:00 Uhr",
                "Berlin HQ",
                "RSO-2026-0042",
                "ReStockOffice Logistics",
                "3. OG, Kueche Nord",
                "Ablage links neben dem Kaffeevollautomaten",
                "Nina Schulz, +49 30 123456",
                "Bitte Zugang ueber den Haupteingang anmelden.",
                null,
                "https://restockoffice.de/deliveries/rso-2026-0042",
                PREVIEW_LOGO_URL,
                null,
                List.of(
                        new DeliveryItem("Haferdrink Barista", "HD-2048", "12"),
                        new DeliveryItem("Kaffeebohnen House Blend", "KB-1102", "6"),
                        new DeliveryItem("Bio Tee Mix", "TM-7781", "8")
                )
        );
    }
}
