package de.restockoffice.article;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
@SuppressWarnings("java:S1104")
public class Article extends PanacheEntityBase {
    @Id
    public String productId;

    public String name;
    public String description;
    public Double price;
    public String brand;
    public String category;
    public String unit;
    public int unitCount;
    public String imageUrl;
}
