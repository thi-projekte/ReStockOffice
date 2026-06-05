package de.restockoffice;

public class DeliveredArticleSummaryDto {

    private String articleNumber;
    private int quantity;

    public DeliveredArticleSummaryDto() {
    }

    public DeliveredArticleSummaryDto(String articleNumber, int quantity) {
        this.articleNumber = articleNumber;
        this.quantity = quantity;
    }

    public String getArticleNumber() {
        return articleNumber;
    }

    public void setArticleNumber(String articleNumber) {
        this.articleNumber = articleNumber;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }
}
