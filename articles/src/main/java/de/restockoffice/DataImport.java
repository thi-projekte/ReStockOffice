package de.restockoffice;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.io.InputStream;
import java.util.List;

@ApplicationScoped
public class DataImport {

    @Inject
    ObjectMapper mapper;

    @Transactional
    public void loadInitialData(@Observes StartupEvent ev) {
        if (Article.count() > 0) return;

        try (InputStream is = Thread.currentThread().getContextClassLoader().getResourceAsStream("products.json")) {
            if (is == null) {
                throw new RuntimeException("products.json nicht im Classpath gefunden!");
            }

            List<Article> articles = mapper.readValue(is, new TypeReference<List<Article>>(){});
            Article.persist(articles);
            System.out.println(articles.size() + " Artikel erfolgreich importiert!");
        } catch (Exception e) {
            System.err.println("Fehler beim Datenimport: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
