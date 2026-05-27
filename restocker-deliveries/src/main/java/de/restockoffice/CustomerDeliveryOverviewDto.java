package de.restockoffice;

public class CustomerDeliveryOverviewDto {
    public DeliverySummaryDto lastDelivery;
    public DeliverySummaryDto nextDelivery;

    public CustomerDeliveryOverviewDto(DeliverySummaryDto lastDelivery, DeliverySummaryDto nextDelivery) {
        this.lastDelivery = lastDelivery;
        this.nextDelivery = nextDelivery;
    }
}
