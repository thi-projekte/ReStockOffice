package de.restockoffice.dto;

import io.quarkus.runtime.annotations.RegisterForReflection;

@RegisterForReflection
public record RestockerDisplayNameResponse(String displayName) {
}
