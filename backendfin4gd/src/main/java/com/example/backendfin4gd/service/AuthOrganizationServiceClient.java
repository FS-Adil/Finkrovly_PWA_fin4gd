package com.example.backendfin4gd.service;

import com.example.backendfin4gd.dto.UserOrganizationResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Slf4j
@Component
public class AuthOrganizationServiceClient {

    private final RestClient restClient;

    private final String internalSecret;

    public AuthOrganizationServiceClient(
            RestClient.Builder builder,
            @Value("${app.services.auth-service.url}") String baseUrl,
            @Value("${app.services.auth-service.internal-secret}") String internalSecret
    ) {
        this.restClient = builder
                .baseUrl(baseUrl)
                .build();

        this.internalSecret = internalSecret;

        if (internalSecret == null || internalSecret.isBlank()) {
            throw new IllegalStateException(
                    "Auth Service internal secret is not configured"
            );
        }
    }

    // =========================================================
    // ПОЛУЧЕНИЕ АКТИВНЫХ ОРГАНИЗАЦИЙ ПОЛЬЗОВАТЕЛЯ
    // =========================================================

    public List<UserOrganizationResponse> getUserOrganizations(UUID userId) {

        if (userId == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not authenticated"
            );
        }

        log.debug("--> getUserOrganizations --> userId: {}", userId);

        try {
            List<UserOrganizationResponse> response = restClient.get()
                    .uri("/internal/organizations/user/{userId}", userId)
                    .header("X-Internal-Service-Secret", internalSecret)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            return response == null ? List.of() : response;

        } catch (RestClientException exception) {

            log.error(
                    "Failed to get organizations from Auth Service for userId: {}",
                    userId,
                    exception
            );

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Auth Service is unavailable"
            );
        }
    }
}