package org.acme;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.transaction.Transactional;

import java.io.InputStream;
import java.util.List;

@ApplicationScoped
public class DataImport {

    @Transactional
    public void loadInitialData(@Observes StartupEvent ev) {
        if (Article.count() > 0) return;

        try (InputStream is = getClass().getResourceAsStream("/products.json")) {
            if (is == null) {
                throw new RuntimeException("products.json nicht im Classpath gefunden!");
            }

            ObjectMapper mapper = new ObjectMapper();
            List<Article> articles = mapper.readValue(is, new TypeReference<List<Article>>(){});
            Article.persist(articles);
            System.out.println("Erfolgreich importiert!");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
