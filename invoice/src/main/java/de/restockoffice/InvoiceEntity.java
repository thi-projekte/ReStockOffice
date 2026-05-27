package de.restockoffice;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import io.quarkus.hibernate.orm.panache.PanacheEntity;

import java.math.BigDecimal;

@Entity
@Table(name="invoices")
public class InvoiceEntity extends PanacheEntity {

    public String userId;

    public String invoiceNumber;
    public String recipientName;
    public String recipientEmail;
    public String issueDate;

    public BigDecimal netAmount;
    public BigDecimal taxAmount;
    public BigDecimal grossAmount;

    @Lob
    @Column(name = "zugferd_pdf")
    @JsonIgnore
    public byte[] zugferdPdf;

    public InvoiceEntity() {}

    public static String generateNextInvoiceNumber(){
        int year = java.time.Year.now().getValue();

        Long nextVal = (Long) getEntityManager()
                .createNativeQuery("SELECT nextval('invoice_num_seq')")
                .getSingleResult();

        return "RE-" + year + "-" + String.format("%05d", nextVal);
    }
}
