package de.restockoffice.repository;

import de.restockoffice.domain.Restocker;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class RestockerRepository implements PanacheRepositoryBase<Restocker, String> {

}