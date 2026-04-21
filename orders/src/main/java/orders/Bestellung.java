package orders;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
public class Bestellung extends PanacheEntity {

    public int kundenummer;
    public int produktnummer;
    public int menge;

    public String status;
    public LocalDateTime createdAt;

    public static Bestellung bestellen(int kundenummer, int produktnummer, int menge) {
        Bestellung bestellung = new Bestellung();
        bestellung.kundenummer = kundenummer;
        bestellung.produktnummer = produktnummer;
        bestellung.menge = menge;
        bestellung.createdAt = LocalDateTime.now();
        return bestellung;
    }
}