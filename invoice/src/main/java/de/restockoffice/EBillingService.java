package de.restockoffice;

import jakarta.enterprise.context.ApplicationScoped;

// Convert PDF/A to eBilling (ZUGFeRD)
@ApplicationScoped
public class EBillingService {

    public byte[] makeZUGFeRD(byte[] pdf, InvoiceRequest request){
        return null;
    }
}
