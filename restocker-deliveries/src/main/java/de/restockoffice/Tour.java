package de.restockoffice;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "tours")
public class Tour extends PanacheEntityBase {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    public UUID id;

    @Column(name = "restocker_name", nullable = false)
    public String restockerName;

    // Set when restocker presses "TOUR BEGINNEN"
    @Column(name = "start_time")
    public LocalDateTime startTime;

    // Set when restocker presses "TOUR BEENDEN"
    @Column(name = "end_time")
    public LocalDateTime endTime;

    @Column(name = "earnings", precision = 10, scale = 2)
    public BigDecimal earnings = BigDecimal.ZERO;

    @Column(name = "tour_date", nullable = false)
    public java.time.LocalDate tourDate = java.time.LocalDate.now();

    @OneToMany(mappedBy = "tour", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stopOrder ASC")
    @JsonIgnore
    public List<Delivery> deliveries = new ArrayList<>();

    // ── Convenience methods ──────────────────────

    public void start() {
        this.startTime = LocalDateTime.now();
    }

    public void end(BigDecimal totalEarnings) {
        this.endTime = LocalDateTime.now();
        this.earnings = totalEarnings;
    }

    public boolean isStarted() {
        return this.startTime != null;
    }

    public boolean isFinished() {
        return this.endTime != null;
    }

    public boolean allPackagesCollected() {
        return this.deliveries.stream().allMatch(d -> d.collected);
    }

    public static List<Tour> findByRestocker(String restockerName) {
        return list("restockerName", restockerName);
    }

    public static List<Tour> findTodayByRestocker(String restockerName) {
        return list("restockerName = ?1 and tourDate = ?2",
                restockerName, java.time.LocalDate.now());
    }
}
