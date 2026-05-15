package de.restockoffice;

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
    public Article getArticleByItemId(@QueryParam("productId") String productId){
        Article article = Article.find("productId", productId).firstResult();

        if(article == null){
            throw new WebApplicationException("Artikel mit ID " + productId + " nicht gefunden");
        }
        return article;
    }

    // Rückgabe aller Artikel mit /articleByCategory?article-type=xxxxxx
    @GET
    @Path("articleByCategory")
    public List<Article> getArticleByCategory(@QueryParam("category") String category){
        List<Article> articleList = Article.find("LOWER(category) = LOWER(?1)", category.toLowerCase()).list();

        if (articleList.isEmpty()) {
            throw new WebApplicationException("Keine Artikel für den Typ '" + category + "' gefunden", 404);
        }

        return articleList;
    }
}
