package de.restockoffice;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class UserDto {
    public String userId;
    public String postalCode;
    public String city;
    public String street;
    public String houseNumber;
    public String country;
    public String companyName;
    public String phoneNumber;
    public String roleInCompany;
    public String deliveryHint;
    public String deliveryDay;
    public String deliveryTime;
}
