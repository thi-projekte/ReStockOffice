package org.acme;
@Path("/test")
public class TestResource {

    @GET
    public String test() {
        System.out.println("🔥 WORKS");
        return "OK";
    }
}