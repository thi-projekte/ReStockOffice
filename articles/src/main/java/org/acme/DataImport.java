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
    public void loadInitialData(@Observes StartupEvent ev){
        if(Article.count() > 0){
            return;
        }

        try {
            ObjectMapper mapper = new ObjectMapper();
            TypeReference<List<Article>> typeReference = new TypeReference<List<Article>>(){};

            // Datei aus resources laden
            InputStream inputStream = Thread.currentThread().getContextClassLoader().getResourceAsStream("/products.json");
            List<Article> articles = mapper.readValue(inputStream, typeReference);


            // In die DB speichern
            Article.persist(articles);
        } catch (Exception e) {
            System.out.println("Fehler beim JSON-Import: " + e.getMessage());
        }
    }
}
