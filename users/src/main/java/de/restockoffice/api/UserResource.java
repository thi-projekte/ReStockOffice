package de.restockoffice.api;

import static security.SecurityConstants.*;

import de.restockoffice.domain.Customer;
import de.restockoffice.domain.Restocker;
import de.restockoffice.dto.CustomerProfileResponse;
import de.restockoffice.dto.RestockerCustomerDTO;
import de.restockoffice.dto.RestockerProfileResponse;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Status;
import jakarta.transaction.Synchronization;
import jakarta.transaction.Transactional;
import jakarta.transaction.TransactionSynchronizationRegistry;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.RestForm;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Path("/")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class UserResource {
    private static final Logger LOG = Logger.getLogger(UserResource.class);
    private static final String AUTHORIZATION_HEADER = "Authorization";

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    // S3 for Pics
    @Inject
    software.amazon.awssdk.services.s3.S3Client s3;

    // Token for Keycloak E-Mail
    @Inject
    JsonWebToken jwt;

    // Keycloak
    @Inject
    org.keycloak.admin.client.Keycloak keycloak;

    // Identity and Roles
    @Inject
    SecurityIdentity securityIdentity;

    @Inject
    TransactionSynchronizationRegistry transactionSynchronizationRegistry;

    @ConfigProperty(name = "deliveriesservice.base-url", defaultValue = "https://restocker-deliveries.restockoffice.de")
    String deliveriesServiceBaseUrl;

    @Context
    HttpHeaders headers;

    // logged-in Customer
    @GET
    @Path("customer/me")
    public CustomerProfileResponse getMyCustomerData() {
        Customer customer =  findCustomerOrThrow(securityIdentity.getPrincipal().getName());
        String email = jwt.getClaim("email");
        return new CustomerProfileResponse(customer, email);
    }

    // logged-in Restocker
    @GET
    @Path("restocker/me")
    public RestockerProfileResponse getMyRestockerData() {
        Restocker restocker = findRestockerOrThrow(securityIdentity.getPrincipal().getName());
        String email = jwt.getClaim("email");
        return new RestockerProfileResponse(restocker, email);
    }

    // Any Customer by ID (admin-role or own user needed)
    @GET
    @Path("customer")
    public CustomerProfileResponse getCustomerById(@QueryParam("userId") String userId){
        String loggedInId = securityIdentity.getPrincipal().getName();

        if (!loggedInId.equals(userId) && !securityIdentity.hasRole(ROLE_ADMIN) && !securityIdentity.hasRole(ROLE_PROCESS_ENGINE)) {
            throw new WebApplicationException("Zugriff verweigert: Sie dürfen nur Ihre eigenen Daten einsehen.", 403);
        }
        Customer customer =  findCustomerOrThrow(userId);

        String customerEmail = null;
        try{
            customerEmail = keycloak.realm(KEYCLOAK_REALM)
                    .users()
                    .get(userId)
                    .toRepresentation()
                    .getEmail();
        }catch (Exception e) {
            LOG.error("Fehler beim Abrufen der Keycloak-Email für User {}: ", userId, e);
            customerEmail = "E-Mail nicht verfügbar";
        }
        return new CustomerProfileResponse(customer, customerEmail);
    }

    // Extra view for Restockers with limited access (only for Restocker and Admin)
    @GET
    @Path("customerForRestocker")
    public RestockerCustomerDTO getCustomerAddressForRestocker(@QueryParam("userId") String userId){
        if (!securityIdentity.hasRole(ROLE_RESTOCKER) && !securityIdentity.hasRole("Restocker") && !securityIdentity.hasRole(ROLE_ADMIN)) {
            throw new WebApplicationException("Zugriff verweigert: Nur Lieferanten dürfen diese Lieferdaten einsehen.", 403);
        }
        if (userId == null || userId.isBlank()) {
            throw new WebApplicationException("Übergebene userId darf nicht leer sein.", 400);
        }

        Customer customer = findCustomerOrThrow(userId);
        String customerEmail = null;

        // Get mail from Keycloak
        try {
            customerEmail = keycloak.realm(KEYCLOAK_REALM)
                    .users()
                    .get(userId)
                    .toRepresentation()
                    .getEmail();
        } catch (Exception e) {
            LOG.error("Error at calling the Keycloak-Mail for user: {} ", userId, e);
            customerEmail = "E-Mail nicht verfügbar";
        }
        return new RestockerCustomerDTO(customer, customerEmail);
    }

    // Any Restocker by ID (admin-role or own user needed)
    @GET
    @Path("restocker")
    public Restocker getRestockerById(@QueryParam("userId") String userId){
        String loggedInId = securityIdentity.getPrincipal().getName();

        if (!loggedInId.equals(userId) && !securityIdentity.hasRole(ROLE_ADMIN)) {
            throw new WebApplicationException("Zugriff verweigert: Sie dürfen nur Ihre eigenen Daten einsehen.", 403);
        }
        return findRestockerOrThrow(userId);
    }

    // All Customers (Admin Only)
    @GET
    @Path("customers")
    @RolesAllowed("admin")
    public List<Customer> getAllCustomers(){
        return PanacheEntityBase.listAll();
    }

    // All Restockers (Admin Only)
    @GET
    @Path("restockers")
    @RolesAllowed("admin")
    public List<Restocker> getAllRestockers(){
        return PanacheEntityBase.listAll();
    }

    // Create a new Customer
    @POST
    @Path("customer/create")
    @Transactional
    public Response createCustomer(Customer newCustomer){
        String userId = securityIdentity.getPrincipal().getName();
        newCustomer.userId = userId;

        if (PanacheEntityBase.findById(userId) != null) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("Profil existiert bereits.").build();
        }

        newCustomer.createdAt = LocalDateTime.now();
        newCustomer.persist();

        return Response.created(URI.create("customer/me")).entity(newCustomer).build();
    }

    @POST
    @Path("url")
    @Transactional
    public Response updateProfilePictureUrl() {
        String userId = securityIdentity.getPrincipal().getName();
        String newImageUrl = "https://hel1.your-objectstorage.com/restockoffice/users/" + userId + ".jpg";
        boolean foundAndUpdated = false;
        Customer customer = PanacheEntityBase.findById(userId);

        if (customer != null) {
            customer.profilePictureUrl = newImageUrl;
            customer.updatedAt = LocalDateTime.now();
            customer.persist();
            foundAndUpdated = true;
        }

        if (!foundAndUpdated) {
            Restocker restocker = PanacheEntityBase.findById(userId);
            if (restocker != null) {
                restocker.profilePictureUrl = newImageUrl;
                restocker.updatedAt = LocalDateTime.now();
                restocker.persist();
                foundAndUpdated = true;
            }
        }

        if (!foundAndUpdated) {
            throw new WebApplicationException("Kein aktives Benutzerprofil (Customer/Restocker) für diese ID gefunden.", 404);
        }

        return Response.ok()
                .entity("{\"message\":\"Profilbild-URL erfolgreich aktualisiert.\",\"url\":\"" + newImageUrl + "\"}")
                .build();
    }

    // Create a new Customer
    @POST
    @Path("restocker/create")
    @Transactional
    public Response createRestocker(Restocker newRestocker){
        String userId = securityIdentity.getPrincipal().getName();
        newRestocker.userId = userId;

        if (PanacheEntityBase.findById(userId) != null) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("Profil existiert bereits.").build();
        }

        newRestocker.createdAt = LocalDateTime.now();
        newRestocker.persist();

        return Response.created(URI.create("restocker/me")).entity(newRestocker).build();
    }

    // Update existing Customer
    @POST
    @Path("customer/update")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    public Response updateCustomer(
            // Userdata as JSON for Fields
            @RestForm("userData") @org.jboss.resteasy.reactive.PartType(MediaType.APPLICATION_JSON) Customer updatedData,
            // File for Profile-Picture
            @RestForm("file") org.jboss.resteasy.reactive.multipart.FileUpload file
    ){
        String userId = securityIdentity.getPrincipal().getName();
        updatedData.userId = userId;
        Customer entity = findCustomerOrThrow(userId);
        boolean deliveryDayChanged = !Objects.equals(entity.deliveryDay, updatedData.deliveryDay);
        boolean hasChanged = applyCustomerChanges(entity, updatedData);

        if (file != null && file.uploadedFile() != null) {
            // Prüfung Dateityp
            if(!file.contentType().startsWith("image/")){
                throw new WebApplicationException("Ungültiger Dateityp. Nur Bilder sind erlaubt.", 400);
            }
            // Prüfung Dateigröße
            if (file.size() > 5 * 1024 * 1024) {
                throw new WebApplicationException("Datei ist zu groß. Maximal 5MB erlaubt.", 400);
            }

            entity.profilePictureUrl = uploadProfilePicture(userId, file);
            hasChanged = true;
        }

        if (hasChanged) {
            entity.updatedAt = LocalDateTime.now();
        }

        if (deliveryDayChanged) {
            scheduleCustomerDeliveryReplanAfterCommit(userId, headers.getHeaderString(AUTHORIZATION_HEADER));
        }

        return Response.ok(entity).build();
    }

    // Update existing Restocker
    @POST
    @Path("restocker/update")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    public Response updateRestocker(
            // Userdata as JSON for Fields
            @RestForm("userData") @org.jboss.resteasy.reactive.PartType(MediaType.APPLICATION_JSON) Restocker updatedData,
            // File for Profile-Picture
            @RestForm("file") org.jboss.resteasy.reactive.multipart.FileUpload file
    ){
        String userId = securityIdentity.getPrincipal().getName();
        updatedData.userId = userId;
        Restocker entity = findRestockerOrThrow(userId);
        boolean hasChanged = applyRestockerChanges(entity, updatedData);

        if (file != null && file.uploadedFile() != null) {
            // Prüfung Dateityp
            if(!file.contentType().startsWith("image/")){
                throw new WebApplicationException("Ungültiger Dateityp. Nur Bilder sind erlaubt.", 400);
            }
            // Prüfung Dateigröße
            if (file.size() > 5 * 1024 * 1024) {
                throw new WebApplicationException("Datei ist zu groß. Maximal 5MB erlaubt.", 400);
            }

            entity.profilePictureUrl =uploadProfilePicture(userId, file);
            hasChanged = true;
        }

        if (hasChanged) {
            entity.updatedAt = LocalDateTime.now();
        }

        return Response.ok(entity).build();
    }

    private Customer findCustomerOrThrow(String userId) {
        Customer user = PanacheEntityBase.findById(userId);

        if (user == null) {
            throw new WebApplicationException("Customer-Profil nicht gefunden.", 404);
        }
        return user;
    }

    private Restocker findRestockerOrThrow(String userId) {
        Restocker user = PanacheEntityBase.findById(userId);

        if (user == null) {
            throw new WebApplicationException("Restocker-Profil nicht gefunden.", 404);
        }
        return user;
    }

    private boolean applyCustomerChanges(Customer entity, Customer updated) {
        boolean changed = false;
        if (!Objects.equals(entity.postalCode, updated.postalCode)) { entity.postalCode = updated.postalCode; changed = true; }
        if (!Objects.equals(entity.city, updated.city)) { entity.city = updated.city; changed = true; }
        if (!Objects.equals(entity.street, updated.street)) { entity.street = updated.street; changed = true; }
        if (!Objects.equals(entity.houseNumber, updated.houseNumber)) { entity.houseNumber = updated.houseNumber; changed = true; }
        if (!Objects.equals(entity.country, updated.country)) { entity.country = updated.country; changed = true; }
        if (!Objects.equals(entity.companyName, updated.companyName)) { entity.companyName = updated.companyName; changed = true; }
        if (!Objects.equals(entity.phoneNumber, updated.phoneNumber)) { entity.phoneNumber = updated.phoneNumber; changed = true; }
        if (!Objects.equals(entity.roleInCompany, updated.roleInCompany)) { entity.roleInCompany = updated.roleInCompany; changed = true; }
        if (!Objects.equals(entity.birthDate, updated.birthDate)) { entity.birthDate = updated.birthDate; changed = true; }
        if (!Objects.equals(entity.deliveryDay, updated.deliveryDay)) { entity.deliveryDay = updated.deliveryDay; changed = true; }
        if (!Objects.equals(entity.deliveryTime, updated.deliveryTime)) { entity.deliveryTime = updated.deliveryTime; changed = true; }
        if (!Objects.equals(entity.deliveryHint, updated.deliveryHint)) { entity.deliveryHint = updated.deliveryHint; changed = true; }
        if (!Objects.equals(entity.iban, updated.iban)) { entity.iban = updated.iban; changed = true; }
        return changed;
    }

    private void scheduleCustomerDeliveryReplanAfterCommit(String customerId, String authHeader) {
        if (customerId == null || customerId.isBlank()) {
            return;
        }

        transactionSynchronizationRegistry.registerInterposedSynchronization(new Synchronization() {
            @Override
            public void beforeCompletion() { // default implementation ignored
            }

            @Override
            public void afterCompletion(int status) {
                if (status == Status.STATUS_COMMITTED) {
                    triggerCustomerDeliveryReplan(customerId, authHeader);
                }
            }
        });
    }

    private void triggerCustomerDeliveryReplan(String customerId, String authHeader) {
        String url = trimTrailingSlash(deliveriesServiceBaseUrl)
                + "/api/deliveries/customers/"
                + URLEncoder.encode(customerId.trim(), StandardCharsets.UTF_8)
                + "/replan";
        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder(URI.create(url))
                .header("Accept", MediaType.APPLICATION_JSON)
                .header("Content-Type", MediaType.APPLICATION_JSON)
                .POST(HttpRequest.BodyPublishers.noBody());
        if (authHeader != null && !authHeader.isBlank()) {
            requestBuilder.header(AUTHORIZATION_HEADER, authHeader);
        }

        try {
            HttpResponse<String> response = HTTP_CLIENT.send(
                    requestBuilder.build(),
                    HttpResponse.BodyHandlers.ofString()
            );
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                LOG.warnf("Delivery replan failed for customer %s: HTTP %s body=%s", customerId, response.statusCode(), response.body());
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            LOG.warnf(exception, "Delivery replan request interrupted for customer %s", customerId);
        } catch (IOException | RuntimeException exception) {
            LOG.warnf(exception, "Delivery replan request failed for customer %s", customerId);
        }
    }

    private String trimTrailingSlash(String value) {
        if (value == null || !value.endsWith("/")) {
            return value;
        }

        return value.substring(0, value.length() - 1);
    }

    private boolean applyRestockerChanges(Restocker entity, Restocker updated) {
        boolean changed = false;

        if (!Objects.equals(entity.postalCode, updated.postalCode)) { entity.postalCode = updated.postalCode; changed = true; }
        if (!Objects.equals(entity.city, updated.city)) { entity.city = updated.city; changed = true; }
        if (!Objects.equals(entity.street, updated.street)) { entity.street = updated.street; changed = true; }
        if (!Objects.equals(entity.houseNumber, updated.houseNumber)) { entity.houseNumber = updated.houseNumber; changed = true; }
        if (!Objects.equals(entity.country, updated.country)) { entity.country = updated.country; changed = true; }
        if (!Objects.equals(entity.phoneNumber, updated.phoneNumber)) { entity.phoneNumber = updated.phoneNumber; changed = true; }
        if (!Objects.equals(entity.birthDate, updated.birthDate)) { entity.birthDate = updated.birthDate; changed = true; }
        return changed;
    }

    private String uploadProfilePicture(String userId, org.jboss.resteasy.reactive.multipart.FileUpload file) {
        try {
            String bucketName = "restockoffice";
            String fileName = "users/" + userId + ".jpg";
            s3.putObject(software.amazon.awssdk.services.s3.model.PutObjectRequest.builder()
                            .bucket(bucketName).key(fileName)
                            .acl(software.amazon.awssdk.services.s3.model.ObjectCannedACL.PUBLIC_READ)
                            .contentType(file.contentType()).build(),
                    software.amazon.awssdk.core.sync.RequestBody.fromFile(file.uploadedFile()));
            return "https://hel1.your-objectstorage.com/" +bucketName+ "/"+ fileName;
        } catch (Exception e) {
            throw new WebApplicationException("S3 Fehler beim Upload des Profilbilds", 500);
        }
    }
}
