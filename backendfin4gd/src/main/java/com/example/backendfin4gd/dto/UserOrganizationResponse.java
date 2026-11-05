package com.example.backendfin4gd.dto;

import java.util.UUID;

public record UserOrganizationResponse(
        UUID id,
        UUID organizationId,
        String organizationCode
) {
}
