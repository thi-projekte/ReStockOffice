package org.acme;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

import java.util.List;

@Path("/")
@Produces(MediaType.APPLICATION_JSON)
public class ArticleRessource {

    @GET
    @Path("articles")
    public List<Article> getArticles(){
        return Article.listAll();
    }

    @GET
    @Path("article")
    public Article getArticleByItemId(@QueryParam("itemId") String itemId){
        Article article = Article.find("itemId", itemId).firstResult();

        if(article == null){
            throw new WebApplicationException("Artikel mit ID " + itemId + " nicht gefunden");
        }
        return article;
    }
}
