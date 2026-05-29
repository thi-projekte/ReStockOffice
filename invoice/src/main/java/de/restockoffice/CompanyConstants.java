package de.restockoffice;

import io.quarkus.qute.TemplateGlobal;

@TemplateGlobal(name = "company")
public class CompanyConstants {

    public static String name() { return "RestockOffice GmbH"; }
    public static String street() { return "Esplanade 10"; }
    public static String zip() { return "85049"; }
    public static String city() { return "Ingolstadt"; }

    public static String fullAddressLine() {
        return name() + " | " + street() + " | " + zip() + " " + city();
    }

    public static String ceo() { return "Max Mustermann"; }
    public static String hrb() { return "HRB 123456, Amtsgericht München"; }
    public static String email() { return "support@restockoffice.de"; }
    public static String web() { return "www.restockoffice.de"; }

    public static String bankName() { return "Sparkasse Ingolstadt"; }
    public static String iban() { return "DE89 1234 5678 9012 3456 78"; }
    public static String bic() { return "WELADED1XXX"; }
}