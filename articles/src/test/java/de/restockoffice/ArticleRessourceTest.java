package de.restockoffice;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasItem;

@QuarkusTest
class ArticleRessourceTest {

    @Test
    void getArticlesReturnsImportedCatalog() {
        given()
                .when()
                .get("/articles")
                .then()
                .statusCode(200)
                .body("size()", greaterThan(0))
                .body("productId", hasItem("10001"))
                .body("name", hasItem("Kopierpapier A4 Standard"));
    }

    @Test
    void getArticleByProductIdReturnsMatchingArticle() {
        given()
                .queryParam("productId", "10001")
                .when()
                .get("/article")
                .then()
                .statusCode(200)
                .body("productId", equalTo("10001"))
                .body("name", equalTo("Kopierpapier A4 Standard"))
                .body("brand", equalTo("PaperPro"))
                .body("category", equalTo("Papierprodukte"));
    }

    @Test
    void getArticleByCategoryMatchesCaseInsensitiveCategory() {
        given()
                .queryParam("category", "papierprodukte")
                .when()
                .get("/articleByCategory")
                .then()
                .statusCode(200)
                .body("size()", greaterThan(0))
                .body("category", everyItem(equalTo("Papierprodukte")))
                .body("productId", hasItem("10001"));
    }
}
