package com.example.backendfin4gd.controller;

import com.example.backendfin4gd.dto.RegisteredDeviceResponse;
import com.example.backendfin4gd.security.AdilUserPrincipal;
import com.example.backendfin4gd.service.DeviceServiceClient;

import com.example.backendfin4gd.service.DeviceSessionRevocationService;
import lombok.RequiredArgsConstructor;

import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
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
    private final DeviceSessionRevocationService deviceSessionRevocationService;

    // =========================================================
    // ПОЛУЧЕНИЕ УСТРОЙСТВ, ОЖИДАЮЩИХ ПОДТВЕРЖДЕНИЯ
    // =========================================================

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

    // =========================================================
    // ПОЛУЧЕНИЕ ВСЕХ УСТРОЙСТВ ВСЕХ ОРГАНИЗАЦИЙ
    // =========================================================

    @GetMapping
    public List<RegisteredDeviceResponse> findAllDevices(
            @AuthenticationPrincipal AdilUserPrincipal principal
    ) {

        if (principal == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        try {
            return deviceServiceClient.findAllDevices(
                    principal.getId()
            );

        } catch (HttpClientErrorException.Forbidden exception) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Administrator access denied"
            );

        } catch (RestClientException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Device service is unavailable"
            );
        }
    }

    // =========================================================
    // ОДОБРЕНИЕ УСТРОЙСТВА
    // =========================================================

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

        } catch (HttpClientErrorException.NotFound exception) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Device not found"
            );

        } catch (HttpClientErrorException.Conflict exception) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Device is not pending approval"
            );

        } catch (HttpClientErrorException.Forbidden exception) {

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

    // =========================================================
    // БЛОКИРОВКА УСТРОЙСТВА
    // =========================================================

//    @PostMapping("/{deviceId}/block")
//    public RegisteredDeviceResponse blockDevice(
//            @PathVariable UUID deviceId,
//            @AuthenticationPrincipal AdilUserPrincipal principal
//    ) {
//
//        if (principal == null) {
//            throw new ResponseStatusException(
//                    HttpStatus.UNAUTHORIZED,
//                    "Authentication required"
//            );
//        }
//
//        try {
//            return deviceServiceClient.blockDevice(
//                    deviceId,
//                    principal.getId()
//            );
//
//        } catch (HttpClientErrorException.NotFound exception) {
//
//            throw new ResponseStatusException(
//                    HttpStatus.NOT_FOUND,
//                    "Device not found"
//            );
//
//        } catch (HttpClientErrorException.Conflict exception) {
//
//            throw new ResponseStatusException(
//                    HttpStatus.CONFLICT,
//                    "Device cannot be blocked in its current status"
//            );
//
//        } catch (HttpClientErrorException.Forbidden exception) {
//
//            throw new ResponseStatusException(
//                    HttpStatus.FORBIDDEN,
//                    "Administrator access denied"
//            );
//
//        } catch (RestClientException exception) {
//
//            throw new ResponseStatusException(
//                    HttpStatus.BAD_GATEWAY,
//                    "Device service is unavailable"
//            );
//        }
//    }

    @PostMapping("/{deviceId}/block")
    public RegisteredDeviceResponse blockDevice(
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

            // Сначала блокируем устройство в Auth Service.
            RegisteredDeviceResponse response =
                    deviceServiceClient.blockDevice(
                            deviceId,
                            principal.getId()
                    );

            // Только после подтверждения блокировки
            // отзываем HTTP-сессии этого устройства.
            deviceSessionRevocationService.revokeDeviceSessions(deviceId);

            return response;

        } catch (HttpClientErrorException.NotFound exception) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Device not found"
            );

        } catch (HttpClientErrorException.Conflict exception) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Device cannot be blocked in its current status"
            );

        } catch (HttpClientErrorException.Forbidden exception) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Administrator access denied"
            );

        } catch (DataAccessException exception) {

            // Устройство уже заблокировано в Auth Service.
            // Но Redis-сессии могли быть удалены не все.
            // DeviceSessionValidationFilter продолжает
            // запрещать доступ заблокированному устройству.

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Device is blocked, but session revocation is temporarily unavailable"
            );

        } catch (RestClientException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Device service is unavailable"
            );
        }
    }

    // =========================================================
    // РАЗБЛОКИРОВКА УСТРОЙСТВА
    // =========================================================

    @PostMapping("/{deviceId}/unblock")
    public RegisteredDeviceResponse unblockDevice(
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
            return deviceServiceClient.unblockDevice(
                    deviceId,
                    principal.getId()
            );

        } catch (HttpClientErrorException.NotFound exception) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Device not found"
            );

        } catch (HttpClientErrorException.Conflict exception) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Device cannot be unblocked in its current status"
            );

        } catch (HttpClientErrorException.Forbidden exception) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Administrator access denied"
            );

        } catch (RestClientException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Device service is unavailable"
            );
        }
    }
}