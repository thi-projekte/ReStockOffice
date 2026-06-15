package de.restockoffice;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.util.List;

@ApplicationScoped
public class DataImport {

    @Inject
    ObjectMapper mapper;

    private static final Logger log = LoggerFactory.getLogger(DataImport.class);

    @Transactional
    public void loadInitialData(@Observes StartupEvent ev) {
        if (PanacheEntityBase.count() > 0) return;

        try (InputStream is = Thread.currentThread().getContextClassLoader().getResourceAsStream("products.json")) {
            if (is == null) {
                throw new RuntimeException("products.json nicht im Classpath gefunden!");
            }
            List<Article> articles = mapper.readValue(is, new TypeReference<List<Article>>() {});
            PanacheEntityBase.persist(articles);
            log.info("{} Articles importet successfully", articles.size());
        } catch (Exception e) {
            log.error("Exception in importing Articles: {}", e.getMessage());
            e.printStackTrace();
        }
    }
}
