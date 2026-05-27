package de.restockoffice;

public class DeliveredArticleSummaryDto {

    public String articleNumber;
    public int quantity;

    public DeliveredArticleSummaryDto() {
    }

    public DeliveredArticleSummaryDto(String articleNumber, int quantity) {
        this.articleNumber = articleNumber;
        this.quantity = quantity;
    }
}
