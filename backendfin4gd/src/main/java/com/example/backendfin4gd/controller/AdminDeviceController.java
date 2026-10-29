package com.example.backendfin4gd.controller;

import com.example.backendfin4gd.dto.RegisteredDeviceResponse;
import com.example.backendfin4gd.security.AdilUserPrincipal;
import com.example.backendfin4gd.service.DeviceServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
        import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/devices")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminDeviceController {

    private final DeviceServiceClient deviceServiceClient;

    @GetMapping("/pending")
    public List<RegisteredDeviceResponse> findPendingDevices() {
        try {
            return deviceServiceClient.findPendingDevices();
        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Device service is unavailable"
            );
        }
    }


    @PostMapping("/{deviceId}/approve")
    public RegisteredDeviceResponse approve(
            @PathVariable UUID deviceId,
            @AuthenticationPrincipal AdilUserPrincipal principal
    ) {
        if (principal == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        try {
            return deviceServiceClient.approve(
                    deviceId,
                    principal.getId()
            );
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound exception) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Device not found"
            );
        } catch (org.springframework.web.client.HttpClientErrorException.Conflict exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Device is not pending approval"
            );
        } catch (org.springframework.web.client.HttpClientErrorException.Forbidden exception) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Administrator approval denied"
            );
        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Device service is unavailable"
            );
        }
    }
}
