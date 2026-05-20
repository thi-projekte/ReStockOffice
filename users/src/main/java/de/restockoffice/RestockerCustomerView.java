package de.restockoffice;

public class RestockerCustomerView {
    public String companyName;
    public String postalCode;
    public String city;
    public String street;
    public String houseNumber;
    public String country;
    public String deliveryHint;
    public DeliveryDay deliveryDay;
    public int deliveryTime;

    public RestockerCustomerView(Customer customer) {
        this.companyName = customer.companyName;
        this.postalCode = customer.postalCode;
        this.city = customer.city;
        this.street = customer.street;
        this.houseNumber = customer.houseNumber;
        this.country = customer.country;
        this.deliveryHint = customer.deliveryHint;
        this.deliveryDay = customer.deliveryDay;
        this.deliveryTime = customer.deliveryTime;
    }
}
