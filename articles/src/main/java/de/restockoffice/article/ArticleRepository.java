package de.restockoffice.article;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class ArticleRepository implements PanacheRepository<Article> {
    public List<Article> findByCategory(String category) {
        return find("LOWER(category) = LOWER(?1)", category.toLowerCase()).list();
    }

    public Article findByProductId(String productId) {
        return find("productId", productId).firstResult();
    }
}
