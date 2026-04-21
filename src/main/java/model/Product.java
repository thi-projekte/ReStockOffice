package model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class Product extends PanacheEntity {
    public String itemId;
    public String name;
    public String description;
    public Double price;
    public String brand;
    public String article_type;
    public int units;
    public String imageUrl;
}