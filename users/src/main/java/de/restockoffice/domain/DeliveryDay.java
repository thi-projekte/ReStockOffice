package de.restockoffice.domain;

import com.fasterxml.jackson.annotation.JsonFormat;

@JsonFormat(with = JsonFormat.Feature.ACCEPT_CASE_INSENSITIVE_PROPERTIES)
public enum DeliveryDay {
    MONTAG,
    DIENSTAG,
    MITTWOCH,
    DONNERSTAG,
    FREITAG,
    SAMSTAG,
    SONNTAG
}