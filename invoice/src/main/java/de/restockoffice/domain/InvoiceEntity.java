package de.restockoffice.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "invoices")
public class InvoiceEntity extends PanacheEntity {

    private String userId;
    private String invoiceNumber;
    private String recipientName;
    private String recipientEmail;
    private String issueDate;
    private BigDecimal netAmount;
    private BigDecimal taxAmount;
    private BigDecimal grossAmount;

    @Lob
    @Column(name = "zugferd_pdf")
    @com.fasterxml.jackson.annotation.JsonIgnore
    public byte[] zugferdPdf;

    public static String generateNextInvoiceNumber() {
        int year = java.time.Year.now().getValue();

        Long nextVal = (Long) getEntityManager()
                .createNativeQuery("SELECT nextval('invoice_num_seq')")
                .getSingleResult();

        return "RE-" + year + "-" + String.format("%05d", nextVal);
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public void setRecipientName(String recipientName) {
        this.recipientName = recipientName;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public void setRecipientEmail(String recipientEmail) {
        this.recipientEmail = recipientEmail;
    }

    public String getIssueDate() {
        return issueDate;
    }

    public void setIssueDate(String issueDate) {
        this.issueDate = issueDate;
    }

    public BigDecimal getNetAmount() {
        return netAmount;
    }

    public void setNetAmount(BigDecimal netAmount) {
        this.netAmount = netAmount;
    }

    public BigDecimal getTaxAmount() {
        return taxAmount;
    }

    public void setTaxAmount(BigDecimal taxAmount) {
        this.taxAmount = taxAmount;
    }

    public BigDecimal getGrossAmount() {
        return grossAmount;
    }

    public void setGrossAmount(BigDecimal grossAmount) {
        this.grossAmount = grossAmount;
    }

    public byte[] getZugferdPdf() {
        return zugferdPdf;
    }

    public void setZugferdPdf(byte[] zugferdPdf) {
        this.zugferdPdf = zugferdPdf;
    }
}
