package com.example.backendfin4gd.dto;

import java.util.UUID;

public record AuthenticatedUserResponse(
        UUID id,
        UUID organizationId,
        String username,
        String role
) {
}
