package de.restockoffice;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class Article extends PanacheEntity {
    public String itemId;
    public String name;
    public String description;
    public Double price;
    public String brand;
    public String articleType;
    public int units;
    public String imageUrl;
}