package de.restockoffice.delivery;

public class CustomerDeliveryOverviewDto {
    private DeliverySummaryDto lastDelivery;
    private DeliverySummaryDto nextDelivery;

    public CustomerDeliveryOverviewDto() {
    }

    public CustomerDeliveryOverviewDto(DeliverySummaryDto lastDelivery, DeliverySummaryDto nextDelivery) {
        this.lastDelivery = lastDelivery;
        this.nextDelivery = nextDelivery;
    }

    public DeliverySummaryDto getLastDelivery() {
        return lastDelivery;
    }

    public void setLastDelivery(DeliverySummaryDto lastDelivery) {
        this.lastDelivery = lastDelivery;
    }

    public DeliverySummaryDto getNextDelivery() {
        return nextDelivery;
    }

    public void setNextDelivery(DeliverySummaryDto nextDelivery) {
        this.nextDelivery = nextDelivery;
    }
}
