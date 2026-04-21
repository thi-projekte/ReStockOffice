package orders;

import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import acme.Bestellung;

@Path("/orders")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class Service{

    @GET
    public List<Bestellung> getAll() {
        return Bestellung.listAll();
    }

    @GET
    @Path("/{id}")
    public Bestellung getById(@PathParam("id") Long id) {
        return Bestellung.findById(id);
    }

    @POST
    @Transactional
    public Bestellung bestellen(Bestellung input) {
        Bestellung order = Bestellung.bestellen(
                input.kundenummer,
                input.produktnummer,
                input.menge
        );
        order.persist();
        return order;
    }

}