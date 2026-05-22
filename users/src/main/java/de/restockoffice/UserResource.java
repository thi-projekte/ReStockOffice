package de.restockoffice;

import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.resteasy.reactive.RestForm;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Path("/")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class UserResource {

    // S3 for Pics
    @Inject
    software.amazon.awssdk.services.s3.S3Client s3;

    // Token for Keycloak
    @Inject
    JsonWebToken jwt;

    @Inject
    SecurityIdentity securityIdentity;

    // logged-in User
    @GET
    @Path("customer/me")
    public Customer getMyCustomerData() {
        return findCustomerOrThrow(jwt.getSubject());
    }

    @GET
    @Path("restocker/me")
    public Restocker getMyRestockerData() {
        return findRestockerOrThrow(jwt.getSubject());
    }

    @GET
    @Path("customer")
    public Customer getCustomerById(@QueryParam("userId") String userId){
        String loggedInId = jwt.getSubject();

        if (!loggedInId.equals(userId)
            && !securityIdentity.hasRole("admin")
            && !securityIdentity.hasRole("restocker")) {
            throw new WebApplicationException(
                "Zugriff verweigert: Sie dürfen nur Ihre eigenen Daten einsehen.",
                403
            );
        }

        return findCustomerOrThrow(userId);
    }

    @GET
    @Path("customerForRestocker")
    public RestockerCustomerView getCustomerAddressForRestocker(@QueryParam("userId") String userId){
        System.out.println("ROLES FOUND BY QUARKUS: " + securityIdentity.getRoles());
        if (!securityIdentity.hasRole("Restocker") && !securityIdentity.hasRole("restocker") && !securityIdentity.hasRole("admin")) {
            throw new WebApplicationException("Zugriff verweigert: Nur Lieferanten dürfen diese Lieferdaten einsehen.", 403);
        }

        if (userId == null || userId.isBlank()) {
            throw new WebApplicationException("Übergebene userId darf nicht leer sein.", 400);
        }

        Customer customer = findCustomerOrThrow(userId);

        return new RestockerCustomerView(customer);
    }

    @GET
    @Path("restocker")
    public Restocker getRestockerById(@QueryParam("userId") String userId){
        String loggedInId = jwt.getSubject();

        if (!loggedInId.equals(userId)
            && !securityIdentity.hasRole("admin")
            && !securityIdentity.hasRole("restocker")) {
            throw new WebApplicationException(
                "Zugriff verweigert: Sie dürfen nur Ihre eigenen Daten einsehen.",
                403
            );
        }

        return findRestockerOrThrow(userId);
    }

    @GET
    @Path("customers")
    public List<Customer> getAllCustomers(){
        return Customer.listAll();
    }

    @GET
    @Path("restockers")
    public List<Restocker> getAllRestockers(){
        return Restocker.listAll();
    }

    @POST
    @Path("customer/create")
    @Transactional
    public Response createCustomer(Customer newCustomer){
        String userId = jwt.getSubject();

        if (Customer.findById(userId) != null) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("Profil existiert bereits.").build();
        }

        newCustomer.userId = userId;

        newCustomer.persist();

        return Response.created(URI.create("customer/me")).entity(newCustomer).build();
    }

    @POST
    @Path("restocker/create")
    @Transactional
    public Response createRestocker(Restocker newRestocker){
        String userId = jwt.getSubject();

        if (Restocker.findById(userId) != null) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("Profil existiert bereits.").build();
        }

        newRestocker.userId = userId;

        newRestocker.persist();

        return Response.created(URI.create("restocker/me")).entity(newRestocker).build();
    }

    @POST
    @Path("customer/update")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    public Response updateCustomer(
            @RestForm("userData") @org.jboss.resteasy.reactive.PartType(MediaType.APPLICATION_JSON) Customer updatedData,
            @RestForm("file") org.jboss.resteasy.reactive.multipart.FileUpload file
    ){

        String userId = jwt.getSubject();
        Customer entity = findCustomerOrThrow(userId);

        boolean hasChanged = applyCustomerChanges(entity, updatedData);

        if (file != null && file.uploadedFile() != null) {
            entity.profilePictureUrl = uploadProfilePicture(userId, file);
            hasChanged = true;
        }

        if (hasChanged) {
            entity.updatedAt = LocalDateTime.now();
        }

        return Response.ok(entity).build();
    }

    @POST
    @Path("restocker/update")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    public Response updateRestocker(
            @RestForm("userData") @org.jboss.resteasy.reactive.PartType(MediaType.APPLICATION_JSON) Restocker updatedData,
            @RestForm("file") org.jboss.resteasy.reactive.multipart.FileUpload file
    ){

        String userId = jwt.getSubject();
        Restocker entity = findRestockerOrThrow(userId);

        boolean hasChanged = applyRestockerChanges(entity, updatedData);

        if (file != null && file.uploadedFile() != null) {
            entity.profilePictureUrl =uploadProfilePicture(userId, file);
            hasChanged = true;
        }

        if (hasChanged) {
            entity.updatedAt = LocalDateTime.now();
        }

        return Response.ok(entity).build();
    }

    private Customer findCustomerOrThrow(String userId) {
        Customer user = Customer.findById(userId);
        if (user == null) {
            throw new WebApplicationException("Customer-Profil nicht gefunden.", 404);
        }
        return user;
    }

    private Restocker findRestockerOrThrow(String userId) {
        Restocker user = Restocker.findById(userId);
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
        if (!Objects.equals(entity.IBAN, updated.IBAN)) { entity.IBAN = updated.IBAN; changed = true; }
        return changed;
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
            return "https://" + bucketName + ".nbg1.your-objectstorage.com/" + fileName;
        } catch (Exception e) {
            throw new WebApplicationException("S3 Fehler beim Upload des Profilbilds", 500);
        }
    }

}
