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
    public Integer kundenummer;

    @NotNull
    public Integer produktnummer;

    @Min(1)
    public Integer menge;

    public String status = "ERSTELLT";

    public LocalDateTime createdAt = LocalDateTime.now();

    public static Order bestellen(int kundenummer, int produktnummer, int menge) {
        Order bestellung = new Order();
        bestellung.kundenummer = kundenummer;
        bestellung.produktnummer = produktnummer;
        bestellung.menge = menge;
        bestellung.createdAt = LocalDateTime.now();
        return bestellung;
    }
}