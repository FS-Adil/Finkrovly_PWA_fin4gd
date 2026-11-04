package com.example.backendfin4gd.service;

import com.example.backendfin4gd.dto.DeviceStatusResponse;
import com.example.backendfin4gd.dto.DeviceVerificationResponse;
import com.example.backendfin4gd.dto.RegisterDeviceRequest;
import com.example.backendfin4gd.dto.RegisteredDeviceResponse;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.UUID;

@Slf4j
@Component
public class DeviceServiceClient {

    private final RestClient restClient;
    private final String internalSecret;

    public DeviceServiceClient(
            RestClient.Builder builder,
            @Value("${app.services.auth-service.url}") String baseUrl,
            @Value("${app.services.auth-service.internal-secret}") String internalSecret
    ) {
        this.restClient = builder
                .baseUrl(baseUrl)
                .build();

        this.internalSecret = internalSecret;
    }

    // =========================================================
    // РЕГИСТРАЦИЯ УСТРОЙСТВА
    // =========================================================

    public RegisteredDeviceResponse register(
            UUID userId,
            UUID organizationId,
            RegisterDeviceRequest request
    ) {
        return restClient.post()
                .uri("/internal/devices/register")
                .header("X-Internal-Service-Secret", internalSecret)
                .header("X-Authenticated-User-Id", userId.toString())
                .header("X-Authenticated-Organization-Id", organizationId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(RegisteredDeviceResponse.class);
    }

    // =========================================================
    // ПОЛУЧЕНИЕ УСТРОЙСТВ, ОЖИДАЮЩИХ ПОДТВЕРЖДЕНИЯ
    // =========================================================

    public List<RegisteredDeviceResponse> findPendingDevices() {

        List<RegisteredDeviceResponse> response = restClient.get()
                .uri("/internal/devices/pending")
                .header("X-Internal-Service-Secret", internalSecret)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});

        return response == null ? List.of() : response;
    }

    // =========================================================
    // ПОЛУЧЕНИЕ ВСЕХ УСТРОЙСТВ ВСЕХ ОРГАНИЗАЦИЙ
    // =========================================================

    public List<RegisteredDeviceResponse> findAllDevices(UUID adminUserId) {

        List<RegisteredDeviceResponse> response = restClient.get()
                .uri("/internal/devices")
                .header("X-Internal-Service-Secret", internalSecret)
                .header("X-Authenticated-Admin-Id", adminUserId.toString())
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});

        return response == null ? List.of() : response;
    }

    // =========================================================
    // ОДОБРЕНИЕ УСТРОЙСТВА
    // =========================================================

    public RegisteredDeviceResponse approve(
            UUID deviceId,
            UUID adminUserId
    ) {
        return restClient.post()
                .uri("/internal/devices/{deviceId}/approve", deviceId)
                .header("X-Internal-Service-Secret", internalSecret)
                .header("X-Authenticated-Admin-Id", adminUserId.toString())
                .retrieve()
                .body(RegisteredDeviceResponse.class);
    }

    // =========================================================
    // БЛОКИРОВКА УСТРОЙСТВА
    // =========================================================

    public RegisteredDeviceResponse blockDevice(
            UUID deviceId,
            UUID adminUserId
    ) {
        return restClient.post()
                .uri("/internal/devices/{deviceId}/block", deviceId)
                .header("X-Internal-Service-Secret", internalSecret)
                .header("X-Authenticated-Admin-Id", adminUserId.toString())
                .retrieve()
                .body(RegisteredDeviceResponse.class);
    }

    // =========================================================
    // РАЗБЛОКИРОВКА УСТРОЙСТВА
    // =========================================================

    public RegisteredDeviceResponse unblockDevice(
            UUID deviceId,
            UUID adminUserId
    ) {
        return restClient.post()
                .uri("/internal/devices/{deviceId}/unblock", deviceId)
                .header("X-Internal-Service-Secret", internalSecret)
                .header("X-Authenticated-Admin-Id", adminUserId.toString())
                .retrieve()
                .body(RegisteredDeviceResponse.class);
    }

    // =========================================================
    // ПРОВЕРКА АКТИВНОСТИ УСТРОЙСТВА
    // =========================================================

    public boolean isDeviceActive(UUID deviceId, UUID userId) {

        DeviceVerificationResponse response = restClient.get()
                .uri("/internal/devices/{deviceId}/verify", deviceId)
                .header("X-Internal-Service-Secret", internalSecret)
                .header("X-Authenticated-User-Id", userId.toString())
                .retrieve()
                .body(DeviceVerificationResponse.class);

        return response != null && response.active();
    }

    // =========================================================
    // ПОЛУЧЕНИЕ СТАТУСА УСТРОЙСТВА
    // =========================================================

    public DeviceStatusResponse getDeviceStatus(
            UUID deviceId,
            UUID userId
    ) {
        log.debug("--> getDeviceStatus --> ");
        return restClient.get()
                .uri("/internal/devices/{deviceId}/status", deviceId)
                .header("X-Internal-Service-Secret", internalSecret)
                .header("X-Authenticated-User-Id", userId.toString())
                .retrieve()
                .body(DeviceStatusResponse.class);
    }
}