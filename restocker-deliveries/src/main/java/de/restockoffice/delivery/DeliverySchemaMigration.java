package de.restockoffice.delivery;

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
            statement.execute("alter table if exists deliveries add column if not exists published boolean not null default false");
            statement.execute("alter table if exists deliveries add column if not exists published_at timestamp");
            statement.execute("alter table if exists delivery_items drop constraint if exists fkohevvvyp6imme6awd17398gid");
            statement.execute("alter table if exists delivery_items drop column if exists warehouse_item_id");
            statement.execute("""
                    with duplicate_deliveries as (
                        select id
                        from (
                            select id,
                                   row_number() over (
                                       partition by user_id, delivery_date
                                       order by
                                           case when tour_id is not null then 0 else 1 end,
                                           case when accepted_at is not null then 0 else 1 end,
                                           case when delivered_at is not null then 0 else 1 end,
                                           id
                                   ) as duplicate_rank
                            from deliveries
                            where delivery_date is not null
                        ) ranked_deliveries
                        where duplicate_rank > 1
                    )
                    delete from delivery_items
                    where delivery_id in (select id from duplicate_deliveries)
                    """);
            statement.execute("""
                    with duplicate_deliveries as (
                        select id
                        from (
                            select id,
                                   row_number() over (
                                       partition by user_id, delivery_date
                                       order by
                                           case when tour_id is not null then 0 else 1 end,
                                           case when accepted_at is not null then 0 else 1 end,
                                           case when delivered_at is not null then 0 else 1 end,
                                           id
                                   ) as duplicate_rank
                            from deliveries
                            where delivery_date is not null
                        ) ranked_deliveries
                        where duplicate_rank > 1
                    )
                    delete from deliveries
                    where id in (select id from duplicate_deliveries)
                    """);
            statement.execute("""
                    do $$
                    begin
                        if not exists (
                            select 1
                            from pg_constraint
                            where conname = 'uk_deliveries_user_delivery_date'
                        ) then
                            alter table deliveries
                            add constraint uk_deliveries_user_delivery_date unique (user_id, delivery_date);
                        end if;
                    end $$;
                    """);
        } catch (SQLException exception) {
            throw new IllegalStateException("Delivery schema migration failed", exception);
        }
    }
}
