package de.restockoffice.common;

import io.quarkus.qute.TemplateGlobal;

@TemplateGlobal(name = "company")
public class CompanyConstants {

    private CompanyConstants() {}

    public static final String NAME = "RestockOffice GmbH";
    public static final String STREET = "Esplanade 10";
    public static final String ZIP = "85049";
    public static final String CITY = "Ingolstadt";
    public static final String FULL_ADDRESS_LINE = NAME + " | " + STREET + " | " + ZIP + " " + CITY;
    public static final String CEO = "Max Mustermann";
    public static final String HRB = "HRB 123456, Amtsgericht München";
    public static final String EMAIL = "support@restockoffice.de";
    public static final String WEB = "www.restockoffice.de";
    public static final String BANK_NAME = "Sparkasse Ingolstadt";
    public static final String IBAN = "DE89 1234 5678 9012 3456 78";
    public static final String BIC = "WELADED1XXX";
}