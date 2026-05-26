package de.restockoffice;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import io.quarkus.runtime.annotations.RegisterForReflection;
import io.smallrye.common.constraint.NotNull;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.Date;

@Entity
@Table(name = "restockers")
@RegisterForReflection
public class Restocker extends PanacheEntityBase {

    @Id
    public String userId;

    @NotNull
    public String postalCode;

    @NotNull
    public String city;

    @NotNull
    public String street;

    @NotNull
    public String houseNumber;

    @NotNull
    public String country;

    @NotNull
    public String phoneNumber;

    @NotNull
    public String IBAN;

    @NotNull
    public String BIC;

    @NotNull
    public String accountHolder;

    public Date birthDate;

    public String profilePictureUrl;

    public LocalDateTime createdAt = LocalDateTime.now();
    public LocalDateTime updatedAt;

}
