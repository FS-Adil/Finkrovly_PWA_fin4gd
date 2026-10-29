package com.example.backendfin4gd.dto;

import com.example.backendfin4gd.enums.DevicePlatform;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterDeviceRequest(
        @NotBlank
        @Size(max = 150)
        String deviceName,

        @NotNull
        DevicePlatform platform
) {
}
