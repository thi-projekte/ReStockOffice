package de.restockoffice;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.MediaType;

@Path("/")
@Consumes(MediaType.APPLICATION_JSON)
public class MailRessource {

    @POST
    @Path("order-confirmation")
    public String orderConfirmation(){
        return "";
    }

    @POST
    @Path("delivery-announcement")
    public String deliveryAnnouncement(){
        return "";
    }
}
