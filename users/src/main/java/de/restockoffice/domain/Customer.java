package de.restockoffice.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import io.quarkus.runtime.annotations.RegisterForReflection;
import io.smallrye.common.constraint.NotNull;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@RegisterForReflection
public class Customer extends PanacheEntityBase {

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
    public String companyName;

    @NotNull
    public String phoneNumber;

    public String roleInCompany;

    public java.time.LocalDate birthDate;

    public String deliveryHint;

    @Enumerated(EnumType.STRING)
    public DeliveryDay deliveryDay;

    @Min(value = 0, message = "Die Lieferzeit darf nicht kleiner als 0 sein")
    @Max(value = 24, message = "Die Lieferzeit darf nicht größer als 24 sein")
    public int deliveryTime;

    public String iban;

    public String profilePictureUrl;

    public LocalDateTime createdAt = LocalDateTime.now();

    public LocalDateTime updatedAt;
}
