package org.acme;

import java.time.LocalDateTime;
import java.util.*;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;


@Entity
@Table(name = "orders")
public class Order extends PanacheEntity {

    @NotNull
    public String username;

    @NotNull
    public Integer frequency;

    @NotNull
    public Integer produktnummer;

    @Min(1)
    public Integer menge;

    public String status = "ERSTELLT";
    public LocalDateTime createdAt = LocalDateTime.now();

    public static Order bestellen(String username, int produktnummer, int menge, int frequency) {
        Order bestellung = new Order();
        bestellung.username = username;
        bestellung.produktnummer = produktnummer;
        bestellung.menge = menge;
        bestellung.frequency = frequency;
        bestellung.createdAt = LocalDateTime.now();
        return bestellung;
    }
}