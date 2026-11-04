package com.example.backendfin4gd.dto;

import com.example.backendfin4gd.enums.DevicePlatform;
import com.example.backendfin4gd.enums.DeviceStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

public record RegisteredDeviceResponse(

        UUID id,

        String deviceName,
        DevicePlatform platform,
        DeviceStatus status,

        UUID userId,
        String username,
        String email,
        UUID organizationId,

        OffsetDateTime createdAt,
        OffsetDateTime approvedAt,
        OffsetDateTime revokedAt,
        OffsetDateTime lastSeenAt

) {
}