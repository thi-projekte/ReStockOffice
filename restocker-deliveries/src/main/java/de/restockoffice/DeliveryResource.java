package de.restockoffice;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Path("/api/deliveries")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class DeliveryResource {

    @Inject
    DeliveryService deliveryService;

    @Context
    HttpHeaders headers;

    // ── Warehouse ────────────────────────────────

    @GET
    @Path("/warehouse")
    public List<WarehouseItem> getAllWarehouseItems() {
        return deliveryService.getAllWarehouseItems();
    }

    // ── Tours ────────────────────────────────────

    @GET
    @Path("/tours/today")
    public List<Tour> getTodayTours(@QueryParam("restocker") String restockerName) {
        return deliveryService.getTodayToursByRestocker(restockerName);
    }

    @POST
    @Path("/tours")
    public Response createTour(Tour tour) {
        Tour created = deliveryService.createTour(tour);
        return Response.status(Response.Status.CREATED).entity(created).build();
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
    @Path("/tours/{tourId}/start")
    public Response startTour(@PathParam("tourId") UUID tourId) {
        Tour tour = deliveryService.startTour(tourId);
        return Response.ok(tour).build();
    }

    @POST
    @Path("/tours/{tourId}/end")
    public Response endTour(@PathParam("tourId") UUID tourId, EndTourRequest request) {
        Tour tour = deliveryService.endTour(tourId, request.earnings);
        return Response.ok(tour).build();
    }

    // ── Deliveries — enriched with user + order data ──

    /**
     * GET /api/deliveries/tours/{tourId}/details
     * Returns all stops for a tour, each enriched with company info and article list.
     * Frontend only needs this one call — no separate user/order lookups needed.
     */
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

    // ── Warehouse collection ─────────────────────

    @POST
    @Path("/{deliveryId}/collect")
    public Response collectPackage(@PathParam("deliveryId") UUID deliveryId) {
        Delivery delivery = deliveryService.collectPackage(deliveryId);
        return Response.ok(delivery).build();
    }

    // ── Item confirmation ────────────────────────

    @POST
    @Path("/{deliveryId}/items/{itemId}/delivered")
    public Response markItemDelivered(
            @PathParam("deliveryId") UUID deliveryId,
            @PathParam("itemId") UUID itemId) {
        DeliveryItem item = deliveryService.markItemDelivered(itemId);
        return Response.ok(item).build();
    }

    @POST
    @Path("/{deliveryId}/confirm")
    public Response confirmDelivery(@PathParam("deliveryId") UUID deliveryId) {
        Delivery delivery = deliveryService.confirmDelivery(deliveryId);
        return Response.ok(delivery).build();
    }

    public static class EndTourRequest {
        public BigDecimal earnings;
    }

    private String authorizationHeader() {
        return headers.getHeaderString(HttpHeaders.AUTHORIZATION);
    }
}
