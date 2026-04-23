package org.acme;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

import java.util.List;


@Path("/")
@Produces(MediaType.APPLICATION_JSON)
public class ArticleRessource {

    // Rückgabe aller Artikel mit /articles
    @GET
    @Path("articles")
    public List<Article> getArticles(){
        return Article.listAll();
    }

    // Rückgabe aller Artikel mit /article?itemId=xxxxx
    @GET
    @Path("article")
    public Article getArticleByItemId(@QueryParam("itemId") String itemId){
        Article article = Article.find("itemId", itemId).firstResult();

        if(article == null){
            throw new WebApplicationException("Artikel mit ID " + itemId + " nicht gefunden");
        }
        return article;
    }

    // Rückgabe aller Artikel mit /articleByCategory?article-type=xxxxxx
    @GET
    @Path("articleByCategory")
    public Article getArticleByCategory(@QueryParam("article-type") String articleType){
        Article article = Article.find("article-type", articleType).firstResult();

        if(article == null){
            throw new WebApplicationException("Artikel mit ID " + articleType + " nicht gefunden");
        }
        return article;
    }
}
