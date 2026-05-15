package de.restockoffice;

import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestForm;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.Objects;

@Path("/")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class UserResource {

    @Inject
    software.amazon.awssdk.services.s3.S3Client s3;

    @GET
    @Path("user")
    public User getUserById(@QueryParam("userId") String userId){
        User user = User.find("userId", userId).firstResult();

        if(user == null){
            throw new WebApplicationException("User mit UserId " + user + " nicht gefunden");
        }
        return user;
    }

    /* Wegen Sicherheit aktuell auskommentiert
    @GET
    @Path("users")
    public List<User> getAllUsers(){
        return User.listAll();
    } */

    @POST
    @Path("user/create")
    @Transactional
    public Response createUser(User newUser){
        if (newUser.userId == null || User.findById(newUser.userId) != null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("User ID fehlt oder existiert bereits").build();
        }
        newUser.persist();

        return Response.created(URI.create("/users/" + newUser.userId))
                .entity(newUser)
                .build();
    }

    @POST
    @Path("user/update")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    public Response updateUser(
            @RestForm("userData") @org.jboss.resteasy.reactive.PartType(MediaType.APPLICATION_JSON) User updatedUser,
            @RestForm("file") org.jboss.resteasy.reactive.multipart.FileUpload file
    ){
        if (updatedUser.userId == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Update fehlgeschlagen: Keine userId im Payload gefunden").build();
        }

        User entity = User.findById(updatedUser.userId);

        if (entity == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("User mit ID " + updatedUser.userId + " existiert nicht").build();
        }

        boolean hasChanged = false;
        if (!Objects.equals(entity.postalCode, updatedUser.postalCode)) { entity.postalCode = updatedUser.postalCode; hasChanged = true; }
        if (!Objects.equals(entity.city, updatedUser.city)) { entity.city = updatedUser.city; hasChanged = true; }
        if (!Objects.equals(entity.street, updatedUser.street)) { entity.street = updatedUser.street; hasChanged = true; }
        if (!Objects.equals(entity.houseNumber, updatedUser.houseNumber)) { entity.houseNumber = updatedUser.houseNumber; hasChanged = true; }
        if (!Objects.equals(entity.country, updatedUser.country)) { entity.country = updatedUser.country; hasChanged = true; }
        if (!Objects.equals(entity.companyName, updatedUser.companyName)) { entity.companyName = updatedUser.companyName; hasChanged = true; }
        if (!Objects.equals(entity.phoneNumber, updatedUser.phoneNumber)) { entity.phoneNumber = updatedUser.phoneNumber; hasChanged = true; }
        if (!Objects.equals(entity.roleInCompany, updatedUser.roleInCompany)) { entity.roleInCompany = updatedUser.roleInCompany; hasChanged = true; }
        if (!Objects.equals(entity.birthDate, updatedUser.birthDate)) { entity.birthDate = updatedUser.birthDate; hasChanged = true; }
        if (!Objects.equals(entity.deliveryHint, updatedUser.deliveryHint)) { entity.deliveryHint = updatedUser.deliveryHint; hasChanged = true; }
        if (!Objects.equals(entity.IBAN, updatedUser.IBAN)) { entity.IBAN = updatedUser.IBAN; hasChanged = true; }

        if(file != null && file.uploadedFile() != null){
            try{
                String bucketName = "restockoffice";
                String fileName = "users/" + entity.userId + ".jpg";

                s3.deleteObject(d -> d.bucket(bucketName).key(fileName));

                s3.putObject(software.amazon.awssdk.services.s3.model.PutObjectRequest.builder()
                                .bucket(bucketName)
                                .key(fileName)
                                .acl(software.amazon.awssdk.services.s3.model.ObjectCannedACL.PUBLIC_READ)
                                .contentType(file.contentType())
                                .build(),
                        software.amazon.awssdk.core.sync.RequestBody.fromFile(file.uploadedFile()));

                entity.profilePictureUrl = "https://" + bucketName + ".nbg1.your-objectstorage.com/" + fileName;
                hasChanged = true;
            }catch(Exception e){
                return Response.serverError().entity("S3 Fehler: " + e.getMessage()).build();
            }
        }

        if (hasChanged) {
            entity.updatedAt = LocalDateTime.now();
        }

        return Response.ok(entity).build();
    }

}
