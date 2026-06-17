package de.restockoffice.article;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.restockoffice.exceptions.DataImportException;
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

    @Inject
    ArticleRepository articleRepository;

    private static final Logger log = LoggerFactory.getLogger(DataImport.class);

    @Transactional
    public void loadInitialData(@Observes StartupEvent ev) {
        if (articleRepository.count() > 0) return;

        try (InputStream is = Thread.currentThread().getContextClassLoader().getResourceAsStream("products.json")) {
            if (is == null) {
                throw new DataImportException("Die Datei products.json wurde nicht im Classpath gefunden!");
            }
            List<Article> articles = mapper.readValue(is, new TypeReference<List<Article>>() {
            });
            articleRepository.persist(articles);
            log.info("{} Articles importet successfully", articles.size());
        } catch (Exception e) {
            log.error("Exception in importing Articles: {}", e.getMessage());
        }
    }
}
