package de.restockoffice.delivery;

import java.util.List;

public class MonthlyDeliveryCustomersDto {
    private String month;
    private List<String> customerIds;

    public MonthlyDeliveryCustomersDto() {
    }

    public MonthlyDeliveryCustomersDto(String month, List<String> customerIds) {
        this.month = month;
        this.customerIds = customerIds;
    }

    public String getMonth() {
        return month;
    }

    public void setMonth(String month) {
        this.month = month;
    }

    public List<String> getCustomerIds() {
        return customerIds;
    }

    public void setCustomerIds(List<String> customerIds) {
        this.customerIds = customerIds;
    }
}
