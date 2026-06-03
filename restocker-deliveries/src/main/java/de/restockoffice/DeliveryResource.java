package de.restockoffice;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/deliveries")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class DeliveryResource {

    @Inject
    DeliveryService deliveryService;

    @Context
    HttpHeaders headers;

    @GET
    @Path("/tours/today")
    public List<Tour> getTodayTours(@QueryParam("restocker") String restockerName) {
        return deliveryService.getTodayToursByRestocker(restockerName);
    }

    @GET
    @Path("/open")
    public List<DeliveryDetailDto> getOpenDeliveries() {
        return deliveryService.getOpenDeliveries(authorizationHeader());
    }

    @GET
    @Path("/admin/all-deliveries")
    public List<DeliveryDetailDto> getAllDeliveries() {
        return deliveryService.getAllDeliveries(authorizationHeader());
    }

    @GET
    @Path("/customers/{customerId}/previous-month-items")
    public List<DeliveredArticleSummaryDto> getPreviousMonthItems(@PathParam("customerId") String customerId) {
        return deliveryService.getDeliveredArticleSummaryForPreviousMonth(customerId);
    }

    @GET
    @Path("/customers/{customerId}/delivery-overview")
    public CustomerDeliveryOverviewDto getCustomerDeliveryOverview(@PathParam("customerId") String customerId) {
        return deliveryService.getCustomerDeliveryOverview(customerId);
    }

    @GET
    @Path("/customers")
    public MonthlyDeliveryCustomersDto getCustomersWithDeliveriesInMonth(@QueryParam("month") String month) {
        return deliveryService.getCustomersWithDeliveriesInMonth(month);
    }

    @GET
    @Path("/assigned")
    public List<DeliveryDetailDto> getAssignedDeliveries(@QueryParam("restocker") String restockerName) {
        return deliveryService.getAssignedDeliveries(restockerName, authorizationHeader());
    }

    @POST
    @Path("/tours")
    public Response createTour(Tour tour) {
        Tour created = deliveryService.createTour(tour);
        return Response.status(Response.Status.CREATED).entity(created).build();
    }

    @DELETE
    @Path("/admin/all")
    public Map<String, Long> deleteAllDeliveries() {
        return deliveryService.deleteAllDeliveries();
    }

    @POST
    @Path("/admin/test-data")
    public List<DeliveryDetailDto> createTestDeliveries(
            @QueryParam("deliveryDate") String deliveryDate,
            @QueryParam("firstCustomerId") String firstCustomerId,
            @QueryParam("secondCustomerId") String secondCustomerId
    ) {
        return deliveryService.createTestDeliveries(
                deliveryDate,
                firstCustomerId,
                secondCustomerId,
                authorizationHeader()
        );
    }

    @POST
    @Path("/tours/today/sync")
    public Response syncTodayOrders(@QueryParam("restocker") String restockerName) {
        Tour tour = deliveryService.syncTodayOrders(restockerName, authorizationHeader());
        if (tour == null) {
            return Response.noContent().build();
        }

        return Response.ok(tour).build();
    }

    @POST
    @Path("/{deliveryId}/accept")
    public DeliveryDetailDto acceptDelivery(
            @PathParam("deliveryId") UUID deliveryId,
            @QueryParam("restocker") String restockerName
    ) {
        return deliveryService.acceptDelivery(deliveryId, restockerName, authorizationHeader());
    }

    @POST
    @Path("/tours/{tourId}/start")
    public Response startTour(@PathParam("tourId") UUID tourId) {
        Tour tour = deliveryService.startTour(tourId);
        return Response.ok(tour).build();
    }

    @POST
    @Path("/tours/{tourId}/end")
    public Response endTour(@PathParam("tourId") UUID tourId, EndTourRequest request) {
        Tour tour = deliveryService.endTour(tourId, request.getEarnings());
        return Response.ok(tour).build();
    }

    @GET
    @Path("/tours/{tourId}/details")
    public List<DeliveryDetailDto> getTourDetails(@PathParam("tourId") UUID tourId) {
        return deliveryService.getTourDeliveryDetails(tourId, authorizationHeader());
    }

    @GET
    @Path("/{deliveryId}/detail")
    public DeliveryDetailDto getDeliveryDetail(@PathParam("deliveryId") UUID deliveryId) {
        return deliveryService.getDeliveryDetail(deliveryId, authorizationHeader());
    }

    @POST
    @Path("/{deliveryId}/collect")
    public Response collectPackage(@PathParam("deliveryId") UUID deliveryId) {
        Delivery delivery = deliveryService.collectPackage(deliveryId);
        return Response.ok(deliveryStatusResponse(delivery)).build();
    }

    @POST
    @Path("/{deliveryId}/items/{itemId}/delivered")
    public Response markItemDelivered(
            @PathParam("deliveryId") UUID deliveryId,
            @PathParam("itemId") UUID itemId
    ) {
        DeliveryItem item = deliveryService.markItemDelivered(itemId);
        return Response.ok(item).build();
    }

    @POST
    @Path("/{deliveryId}/confirm")
    public Response confirmDelivery(@PathParam("deliveryId") UUID deliveryId) {
        Delivery delivery = deliveryService.confirmDelivery(deliveryId);
        return Response.ok(deliveryStatusResponse(delivery)).build();
    }

    public static class EndTourRequest {
        private BigDecimal earnings;

        public BigDecimal getEarnings() {
            return earnings;
        }

        public void setEarnings(BigDecimal earnings) {
            this.earnings = earnings;
        }
    }

    private String authorizationHeader() {
        return headers.getHeaderString(HttpHeaders.AUTHORIZATION);
    }

    private Map<String, Object> deliveryStatusResponse(Delivery delivery) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", delivery.id);
        response.put("collected", delivery.collected);
        response.put("collectedAt", formatDateTime(delivery.collectedAt));
        response.put("deliveredAt", formatDateTime(delivery.deliveredAt));
        return response;
    }

    private String formatDateTime(LocalDateTime value) {
        return value != null ? value.toString() : null;
    }
}
