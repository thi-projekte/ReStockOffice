package ressource;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import model.Product;

import java.util.List;

@Path("/")
@Produces(MediaType.APPLICATION_JSON)
public class ProductRessource {

    @GET
    @Path("products")
    public List<Product> getProducts(){
        return Product.listAll();
    }

    @GET
    @Path("product")
    public Product getProductByItemId(@QueryParam("itemId") String itemId){
        Product product = Product.find("itemId", itemId).firstResult();

        if(product == null){
            throw new WebApplicationException("Produkt mit ID " + itemId + " nicht gefunden");
        }
        return product;
    }

    /*
    // Nicht mehr nötig
    @POST
    @jakarta.transaction.Transactional
    public Product add(Product product) {
        product.persist();
        return product;
    } */
}
