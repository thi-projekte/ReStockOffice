package de.restockoffice.repository;

import de.restockoffice.domain.InvoiceEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class InvoiceRepository implements PanacheRepositoryBase<InvoiceEntity, Long> {

    public Optional<InvoiceEntity> findByUserIdAndInvoiceNumber(String userId, String invoiceNumber) {
        return find("userId = ?1 and invoiceNumber = ?2", userId, invoiceNumber).firstResultOptional();
    }

    public Optional<InvoiceEntity> findByInvoiceNumber(String invoiceNumber) {
        return find("invoiceNumber", invoiceNumber).firstResultOptional();
    }

    public List<InvoiceEntity> findByUserId(String userId) {
        return list("userId", userId);
    }
}
