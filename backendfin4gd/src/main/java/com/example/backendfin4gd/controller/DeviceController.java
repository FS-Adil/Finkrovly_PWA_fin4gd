package com.example.backendfin4gd.controller;

import com.example.backendfin4gd.dto.DeviceStatusResponse;
import com.example.backendfin4gd.dto.RegisterDeviceRequest;
import com.example.backendfin4gd.dto.RegisteredDeviceResponse;
import com.example.backendfin4gd.security.AdilUserPrincipal;
import com.example.backendfin4gd.service.DeviceServiceClient;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
public class DeviceController {

    public static final String DEVICE_ID_SESSION_KEY =
            "ADIL_BOUND_DEVICE_ID";

    private final DeviceServiceClient deviceServiceClient;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisteredDeviceResponse register(
            @AuthenticationPrincipal AdilUserPrincipal principal,
            @Valid @RequestBody RegisterDeviceRequest request,
            HttpServletRequest httpRequest
    ) {
        if (principal == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        HttpSession session = httpRequest.getSession(false);

        if (session == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Session not found"
            );
        }

        // Не позволяем привязать к одной сессии другое устройство.
        Object existingDeviceId =
                session.getAttribute(DEVICE_ID_SESSION_KEY);

        if (existingDeviceId != null) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A device is already bound to this session"
            );
        }

        try {
            RegisteredDeviceResponse response =
                    deviceServiceClient.register(
                            principal.getId(),
                            principal.getOrganizationId(),
                            request
                    );

            // Привязываем сессию к зарегистрированному устройству.
            // Это не означает, что администратор уже одобрил устройство.
            session.setAttribute(
                    DEVICE_ID_SESSION_KEY,
                    response.id()
            );

            return response;

        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Device service is unavailable"
            );
        }
    }

    @GetMapping("/current-status")
    public DeviceStatusResponse getCurrentDeviceStatus(
            @AuthenticationPrincipal AdilUserPrincipal principal,
            HttpServletRequest request
    ) {
        if (principal == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        HttpSession session = request.getSession(false);

        if (session == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Session not found"
            );
        }

        Object value = session.getAttribute(DEVICE_ID_SESSION_KEY);

        if (value == null) {
            return new DeviceStatusResponse("UNREGISTERED");
        }

        UUID deviceId;

        try {
            deviceId = value instanceof UUID uuid
                    ? uuid
                    : UUID.fromString(value.toString());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Invalid device binding in session"
            );
        }

        try {
            return deviceServiceClient.getDeviceStatus(
                    deviceId,
                    principal.getId()
            );
        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Device service is unavailable"
            );
        }
    }
}