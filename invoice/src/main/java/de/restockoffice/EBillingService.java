package de.restockoffice;

import jakarta.enterprise.context.ApplicationScoped;
import org.mustangproject.Item;
import org.mustangproject.Product;
import org.mustangproject.TradeParty;
import org.mustangproject.ZUGFeRD.IExportableTransaction;
import org.mustangproject.ZUGFeRD.IZUGFeRDAllowanceCharge;
import org.mustangproject.ZUGFeRD.IZUGFeRDExportableItem;
import org.mustangproject.ZUGFeRD.IZUGFeRDExportableTradeParty;
import org.mustangproject.ZUGFeRD.ZUGFeRDExporterFromA3;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;

@ApplicationScoped
public class EBillingService {

    public byte[] makeZUGFeRD(byte[] pdf, InvoiceRequest request) {
        try {
            ZUGFeRDExporterFromA3 exporter = new ZUGFeRDExporterFromA3()
                    .setProducer("ReStockOffice")
                    .setCreator("ReStockOffice");

            exporter.load(pdf);
            exporter.setTransaction(new InvoiceTransaction(request));

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            exporter.export(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("ZUGFeRD-Generierung fehlgeschlagen", e);
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
                return new SimpleDateFormat("yyyy-MM-dd").parse(request.issueDate());
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
    }
}
