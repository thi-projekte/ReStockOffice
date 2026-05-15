package de.restockoffice;

import jakarta.enterprise.context.ApplicationScoped;
import org.mustangproject.Item;
import org.mustangproject.Product;
import org.mustangproject.TradeParty;
import org.mustangproject.ZUGFeRD.*;

import org.mustangproject.ZUGFeRD.PDFAConformanceLevel;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@ApplicationScoped
public class EBillingService {

    public byte[] makeZUGFeRD(byte[] pdf, InvoiceRequest request) {
        try{
            ZUGFeRDExporterFromA3 exporter = new ZUGFeRDExporterFromA3();

            exporter.load(pdf);

            exporter.setConformanceLevel(PDFAConformanceLevel.UNICODE);

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
            TradeParty sender = new TradeParty("RestockOffice GmbH", "Musterstraße 1", "80333", "München", "DE");
            sender.addVATID("DE123456789");
            sender.addTaxID("115/123/45678");
            sender.setID("HRB 123456");

            sender.setID("HRB 123456");

            return sender;
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
            List<IZUGFeRDExportableItem> zfItems = request.orderItems().stream()
                    .map(orderItem -> {
                        String description = (orderItem.description() == null || orderItem.description().isBlank())
                                ? "Position" : orderItem.description();

                        Product product = new Product(description, "", "C62", new BigDecimal("19"));

                        Item item = new Item(product, orderItem.price(), orderItem.quantity());
                        return (IZUGFeRDExportableItem) item;
                    })
                    .collect(Collectors.toList());

            return zfItems.toArray(new IZUGFeRDExportableItem[0]);
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
