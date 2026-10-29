package com.example.backendfin4gd.service;

import com.example.backendfin4gd.dto.AuthenticatedUserResponse;
import com.example.backendfin4gd.dto.LoginRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class AuthServiceClient {

    private final RestClient restClient;
    private final String internalSecret;

    public AuthServiceClient(
            RestClient.Builder builder,
            @Value("${app.services.auth-service.url}") String baseUrl,
            @Value("${app.services.auth-service.internal-secret}") String internalSecret
    ) {
        this.restClient = builder
                .baseUrl(baseUrl)
                .build();

        this.internalSecret = internalSecret;
    }

    public AuthenticatedUserResponse authenticate(LoginRequest request) {

        return restClient.post()
                .uri("/internal/auth/authenticate")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Internal-Service-Secret", internalSecret)
                .body(request)
                .retrieve()
                .body(AuthenticatedUserResponse.class);
    }
}