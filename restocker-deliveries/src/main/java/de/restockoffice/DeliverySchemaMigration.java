package de.restockoffice;

import io.agroal.api.AgroalDataSource;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

@ApplicationScoped
public class DeliverySchemaMigration {

    @Inject
    AgroalDataSource dataSource;

    void onStart(@Observes StartupEvent event) {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {
            statement.execute("alter table if exists delivery_items drop constraint if exists fkohevvvyp6imme6awd17398gid");
            statement.execute("alter table if exists delivery_items drop column if exists warehouse_item_id");
        } catch (SQLException exception) {
            throw new IllegalStateException("Delivery schema migration failed", exception);
        }
    }
}
