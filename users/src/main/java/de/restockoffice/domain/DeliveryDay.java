package de.restockoffice.domain;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonFormat(with = JsonFormat.Feature.ACCEPT_CASE_INSENSITIVE_PROPERTIES)
public enum DeliveryDay {
    @JsonProperty("Montag")
    MONTAG,

    @JsonProperty("Dienstag")
    DIENSTAG,

    @JsonProperty("Mittwoch")
    MITTWOCH,

    @JsonProperty("Donnerstag")
    DONNERSTAG,

    @JsonProperty("Freitag")
    FREITAG,

    @JsonProperty("Samstag")
    SAMSTAG,

    @JsonProperty("Sonntag")
    SONNTAG
}