package de.restockoffice;

import jakarta.enterprise.context.ApplicationScoped;
import org.mustangproject.Item;
import org.mustangproject.Product;
import org.mustangproject.TradeParty;
import org.mustangproject.ZUGFeRD.*;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;

@ApplicationScoped
public class EBillingService {

    public byte[] makeZUGFeRD(byte[] pdf, InvoiceRequest request) {
        try{
            ZUGFeRDExporterFromA3 exporter = new ZUGFeRDExporterFromA3();

            exporter.load(pdf);

            exporter.setZUGFeRDVersion(2);

            exporter.setProfile(Profiles.getByName("EN16931"));

            exporter.setProducer("ReStockOffice")
                    .setCreator("ReStockOffice");

            exporter.setTransaction(new InvoiceTransaction(request));

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            exporter.export(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("ZUGFeRD-Generierung fehlgeschlagen: " + e.getMessage(), e);
        }
    }

    private static class InvoiceTransaction implements IExportableTransaction {

        private final InvoiceRequest request;

        InvoiceTransaction(InvoiceRequest request) {
            this.request = request;
        }

        @Override
        public String getNumber() {
            return request.invoiceNumber();
        }

        @Override
        public Date getIssueDate() {
            try {
                return new SimpleDateFormat("dd.MM.yyyy").parse(request.issueDate());
            } catch (ParseException e) {
                return new Date();
            }
        }

        @Override
        public Date getDueDate() {
            return new Date(getIssueDate().getTime() + 14L * 24 * 60 * 60 * 1000);
        }

        @Override
        public Date getDeliveryDate() {
            return getIssueDate();
        }

        @Override
        public IZUGFeRDExportableTradeParty getSender() {
            return new TradeParty("ReStockOffice GmbH", "Musterstraße 1", "80333", "München", "DE");
        }

        @Override
        public IZUGFeRDExportableTradeParty getRecipient() {
            return new TradeParty(
                    request.recipientName(),
                    request.recipientStreet(),
                    request.recipientZip(),
                    request.recipientCity(),
                    "DE"
            );
        }

        @Override
        public IZUGFeRDExportableItem[] getZFItems() {
            Product product = new Product("Monatliche Büronutzung", "", "C62", new BigDecimal("19"));
            Item item = new Item(product, request.netAmount(), BigDecimal.ONE);
            return new IZUGFeRDExportableItem[]{item};
        }

        @Override
        public IZUGFeRDAllowanceCharge[] getZFAllowances() {
            return new IZUGFeRDAllowanceCharge[0];
        }

        @Override
        public IZUGFeRDAllowanceCharge[] getZFCharges() {
            return new IZUGFeRDAllowanceCharge[0];
        }

        @Override
        public IZUGFeRDAllowanceCharge[] getZFLogisticsServiceCharges() {
            return new IZUGFeRDAllowanceCharge[0];
        }

        @Override
        public String getPaymentTermDescription() {
            return "Zahlbar innerhalb von 14 Tagen ohne Abzug.";
        }

        public String getCurrency() { return "EUR"; }
    }
}
