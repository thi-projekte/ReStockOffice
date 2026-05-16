package de.restockoffice;

import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.annotation.security.RolesAllowed;
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
    @Path("user/me")
    public User getMyData() {
        return findUserOrThrow(jwt.getSubject());
    }

    @GET
    @Path("user")
    public User getUserById(@QueryParam("userId") String userId){
        String loggedInId = jwt.getSubject();

        if (!loggedInId.equals(userId) && !securityIdentity.hasRole("admin")) {
            throw new WebApplicationException("Zugriff verweigert: Sie dürfen nur Ihre eigenen Daten einsehen.", 403);
        }
        return findUserOrThrow(userId);
    }

    @GET
    @Path("users")
    @RolesAllowed("admin")
    public List<User> getAllUsers(){
        return User.listAll();
    }

    @POST
    @Path("user/create")
    @Transactional
    public Response createUser(User newUser){
        String userId = jwt.getSubject();

        if (User.findById(userId) != null) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("Profil existiert bereits.").build();
        }

        newUser.userId = userId;

        newUser.persist();

        return Response.created(URI.create("user/me")).entity(newUser).build();
    }

    @POST
    @Path("user/update")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    public Response updateUser(
            @RestForm("userData") @org.jboss.resteasy.reactive.PartType(MediaType.APPLICATION_JSON) User updatedData,
            @RestForm("file") org.jboss.resteasy.reactive.multipart.FileUpload file
    ){

        String userId = jwt.getSubject();
        User entity = findUserOrThrow(userId);

        boolean hasChanged = applyChanges(entity, updatedData);

        if (file != null && file.uploadedFile() != null) {
            uploadProfilePicture(entity, file);
            hasChanged = true;
        }

        if (hasChanged) {
            entity.updatedAt = LocalDateTime.now();
        }

        return Response.ok(entity).build();
    }

    private User findUserOrThrow(String userId) {
        User user = User.findById(userId);
        if (user == null) {
            throw new WebApplicationException("User-Profil nicht gefunden.", 404);
        }
        return user;
    }

    private boolean applyChanges(User entity, User updated) {
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

    private void uploadProfilePicture(User entity, org.jboss.resteasy.reactive.multipart.FileUpload file) {
        try {
            String bucketName = "restockoffice";
            String fileName = "users/" + entity.userId + ".jpg";
            s3.putObject(software.amazon.awssdk.services.s3.model.PutObjectRequest.builder()
                            .bucket(bucketName).key(fileName)
                            .acl(software.amazon.awssdk.services.s3.model.ObjectCannedACL.PUBLIC_READ)
                            .contentType(file.contentType()).build(),
                    software.amazon.awssdk.core.sync.RequestBody.fromFile(file.uploadedFile()));
            entity.profilePictureUrl = "https://" + bucketName + ".nbg1.your-objectstorage.com/" + fileName;
        } catch (Exception e) {
            throw new WebApplicationException("S3 Fehler", 500);
        }
    }

}
