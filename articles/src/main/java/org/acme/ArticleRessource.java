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
    public List<Article> getArticleByCategory(@QueryParam("articleType") String articleType){
        List<Article> articleList = Article.find("LOWER(articleType) = LOWER(?1)", articleType.toLowerCase()).list();

        if (articleList.isEmpty()) {
            throw new WebApplicationException("Keine Artikel für den Typ '" + articleType + "' gefunden", 404);
        }

        return articleList;
    }
}
