package de.restockoffice;


import de.restockoffice.Delivery;
import de.restockoffice.DeliveryItem;
import de.restockoffice.Tour;
import de.restockoffice.WarehouseItem;
import de.restockoffice.DeliveryService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
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

    // ── Warehouse items ──────────────────────────

    /**
     * GET /api/deliveries/warehouse
     * Returns all warehouse items with current stock.
     * Used in Lager-Dashboard to show available items.
     */
    @GET
    @Path("/warehouse")
    public List<WarehouseItem> getAllWarehouseItems() {
        return deliveryService.getAllWarehouseItems();
    }

    // ── Tours ────────────────────────────────────

    /**
     * GET /api/deliveries/tours/today?restocker=Max
     * Returns today's tours for a restocker.
     * Used on home screen: "Heutige Lieferungen".
     */
    @GET
    @Path("/tours/today")
    public List<Tour> getTodayTours(@QueryParam("restocker") String restockerName) {
        return deliveryService.getTodayToursByRestocker(restockerName);
    }

    /**
     * POST /api/deliveries/tours
     * Creates a new tour with its deliveries.
     * Called when the day's route is planned.
     */
    @POST
    @Path("/tours")
    public Response createTour(Tour tour) {
        Tour created = deliveryService.createTour(tour);
        return Response.status(Response.Status.CREATED).entity(created).build();
    }

    /**
     * POST /api/deliveries/tours/{tourId}/start
     * Restocker presses "TOUR BEGINNEN".
     * Only works when all packages are collected (all collected=true).
     */
    @POST
    @Path("/tours/{tourId}/start")
    public Response startTour(@PathParam("tourId") UUID tourId) {
        Tour tour = deliveryService.startTour(tourId);
        return Response.ok(tour).build();
    }

    /**
     * POST /api/deliveries/tours/{tourId}/end
     * Restocker presses "TOUR BEENDEN" on last stop.
     * Body: { "earnings": 45.70 }
     */
    @POST
    @Path("/tours/{tourId}/end")
    public Response endTour(@PathParam("tourId") UUID tourId, EndTourRequest request) {
        Tour tour = deliveryService.endTour(tourId, request.earnings);
        return Response.ok(tour).build();
    }

    /**
     * GET /api/deliveries/tours/{tourId}/deliveries
     * Returns all stops for a tour in order.
     * Used in "Aktuelle Tour" to show stop list.
     *
     *  WHATS THAT???????
     */
    @GET
    @Path("/tours/{tourId}/deliveries")
    public List<Delivery> getTourDeliveries(@PathParam("tourId") UUID tourId) {
        return deliveryService.getTodayDeliveries(tourId);
    }

    // ── Warehouse collection (Lager-Dashboard) ───

    /**
     * POST /api/deliveries/{deliveryId}/collect
     * Restocker checks off a package in the warehouse (EINGESAMMELT).
     * This is when stock decreases.
     */
    @POST
    @Path("/{deliveryId}/collect")
    public Response collectPackage(@PathParam("deliveryId") UUID deliveryId) {
        Delivery delivery = deliveryService.collectPackage(deliveryId);
        return Response.ok(delivery).build();
    }

    // ── Delivery confirmation (Aktuelle Tour) ────

    /**
     * POST /api/deliveries/{deliveryId}/items/{itemId}/delivered
     * Restocker checks off a single article at the company (EINGERÄUMT checkbox).
     */
    @POST
    @Path("/{deliveryId}/items/{itemId}/delivered")
    public Response markItemDelivered(
            @PathParam("deliveryId") UUID deliveryId,
            @PathParam("itemId") UUID itemId) {
        DeliveryItem item = deliveryService.markItemDelivered(itemId);
        return Response.ok(item).build();
    }

    /**
     * POST /api/deliveries/{deliveryId}/confirm
     * Restocker presses "NÄCHSTE ZUSTELLUNG" after checking all items.
     * Sets deliveredAt timestamp — confirmation sent to company.
     * Only works when all items are delivered (all delivered=true).
     */
    @POST
    @Path("/{deliveryId}/confirm")
    public Response confirmDelivery(@PathParam("deliveryId") UUID deliveryId) {
        Delivery delivery = deliveryService.confirmDelivery(deliveryId);
        return Response.ok(delivery).build();
    }

    // ── Inner request classes ────────────────────

    public static class EndTourRequest {
        public BigDecimal earnings;
    }
}