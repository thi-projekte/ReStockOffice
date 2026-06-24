package de.restockoffice.article;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/")
@Produces(MediaType.APPLICATION_JSON)
public class ArticleRessource {

    @Inject
    ArticleRepository articleRepository;

    // Rückgabe aller Artikel mit /articles
    @GET
    @Path("articles")
    public List<Article> getArticles() {
        return articleRepository.listAll();
    }

    // Rückgabe aller Artikel mit /article?itemId=xxxxx
    @GET
    @Path("article")
    public Article getArticleByItemId(@QueryParam("productId") String productId) {
        Article article = articleRepository.find("productId", productId).firstResult();

        if (article == null) {
            throw new WebApplicationException("Artikel mit ID " + productId + " nicht gefunden");
        }
        return article;
    }

    // Rückgabe aller Artikel mit /articleByCategory?article-type=xxxxxx
    @GET
    @Path("articleByCategory")
    public List<Article> getArticleByCategory(@QueryParam("category") String category) {
        List<Article> articleList = articleRepository.find("LOWER(category) = LOWER(?1)", category.toLowerCase())
                .list();

        if (articleList.isEmpty()) {
            throw new WebApplicationException("Keine Artikel für den Typ '" + category + "' gefunden", 404);
        }
        return articleList;
    }
}
