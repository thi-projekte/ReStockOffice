package de.restockoffice.domain;

import com.fasterxml.jackson.annotation.JsonFormat;

@SuppressWarnings("java:S115")
@JsonFormat(with = JsonFormat.Feature.ACCEPT_CASE_INSENSITIVE_PROPERTIES)
public enum DeliveryDay {
    Montag,
    Dienstag,
    Mittwoch,
    Donnerstag,
    Freitag,
    Samstag,
    Sonntag
}