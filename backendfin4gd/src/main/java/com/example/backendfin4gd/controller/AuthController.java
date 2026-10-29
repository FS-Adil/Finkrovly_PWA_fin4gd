package com.example.backendfin4gd.controller;

import com.example.backendfin4gd.dto.AuthenticatedUserResponse;
import com.example.backendfin4gd.dto.CurrentUserResponse;
import com.example.backendfin4gd.dto.LoginRequest;
import com.example.backendfin4gd.security.AdilUserPrincipal;
import com.example.backendfin4gd.service.AuthServiceClient;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthServiceClient authServiceClient;
    private final SecurityContextRepository securityContextRepository;
    private final CsrfTokenRepository csrfTokenRepository;

    public AuthController(
            AuthServiceClient authServiceClient,
            SecurityContextRepository securityContextRepository,
            CsrfTokenRepository csrfTokenRepository
    ) {
        this.authServiceClient = authServiceClient;
        this.securityContextRepository = securityContextRepository;
        this.csrfTokenRepository = csrfTokenRepository;
    }

    @PostMapping("/login")
    @Parameter(
            name = "X-CSRF-TOKEN",
            description = "CSRF Token",
            required = true,
            in = ParameterIn.HEADER
    )
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        log.info(
                "LOGIN: controller entered, method={}, uri={}, sessionExists={}, " +
                        "sessionIdPresent={}, csrfHeaderPresent={}",
                httpRequest.getMethod(),
                httpRequest.getRequestURI(),
                httpRequest.getSession(false) != null,
                httpRequest.getRequestedSessionId() != null,
                httpRequest.getHeader("X-CSRF-TOKEN") != null
        );

        final AuthenticatedUserResponse user;

        try {
            log.info("LOGIN: calling authentication service");

            user = authServiceClient.authenticate(request);

            log.info(
                    "LOGIN: authentication service returned successfully, userPresent={}",
                    user != null
            );

        } catch (HttpClientErrorException.Unauthorized exception) {
            log.warn("LOGIN: authentication service rejected credentials");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid username or password"));

        } catch (RestClientException exception) {
            log.error(
                    "LOGIN: authentication service request failed, exceptionType={}",
                    exception.getClass().getSimpleName()
            );

            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Authentication service unavailable"));
        }

        if (user == null) {
            log.error("LOGIN: authentication service returned an empty user");
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Authentication service unavailable"));
        }

        AdilUserPrincipal principal = new AdilUserPrincipal(
                user.id(),
                user.organizationId(),
                user.username(),
                user.role()
        );

        Authentication authentication =
                UsernamePasswordAuthenticationToken.authenticated(
                        principal,
                        null,
                        principal.getAuthorities()
                );

        try {
            // Создаём сессию и меняем её ID после входа.
            httpRequest.getSession(true);
            httpRequest.changeSessionId();

            SecurityContext context =
                    SecurityContextHolder.createEmptyContext();

            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);

            securityContextRepository.saveContext(
                    context,
                    httpRequest,
                    httpResponse
            );

            // Инвалидируем старый CSRF-токен.
            csrfTokenRepository.saveToken(
                    null,
                    httpRequest,
                    httpResponse
            );

            log.info(
                    "LOGIN: success, security context saved, " +
                            "sessionExists={}, authenticationPresent={}, responseStatus=200",
                    httpRequest.getSession(false) != null,
                    SecurityContextHolder.getContext().getAuthentication() != null
            );

            return ResponseEntity.ok(
                    new CurrentUserResponse(
                            user.id(),
                            user.organizationId(),
                            user.username(),
                            user.role()
                    )
            );

        } catch (RuntimeException exception) {
            log.error(
                    "LOGIN: exception while creating session or saving security context, exceptionType={}",
                    exception.getClass().getSimpleName(),
                    exception
            );

            throw exception;
        }
    }

//    @GetMapping("/me")
//    public CurrentUserResponse currentUser(
//            @AuthenticationPrincipal AdilUserPrincipal principal
//    ) {
//        return new CurrentUserResponse(
//                principal.getId(),
//                principal.getOrganizationId(),
//                principal.getUsername(),
//                principal.getRole()
//        );
//    }
    @GetMapping("/me")
    public CurrentUserResponse currentUser(
            @AuthenticationPrincipal AdilUserPrincipal principal
    ) {
        log.info("ME: controller entered, principalPresent={}", principal != null);

        if (principal == null) {
            log.warn("ME: principal is null");
            throw new org.springframework.security.authentication.AuthenticationCredentialsNotFoundException(
                    "Authenticated principal is missing"
            );
        }

        log.info("ME: principal resolved, authorities={}",
                SecurityContextHolder.getContext()
                        .getAuthentication()
                        .getAuthorities());

        try {
            CurrentUserResponse response = new CurrentUserResponse(
                    principal.getId(),
                    principal.getOrganizationId(),
                    principal.getUsername(),
                    principal.getRole()
            );

            log.info("ME: response created successfully");

            return response;

        } catch (RuntimeException exception) {
            log.error(
                    "ME: failed to build current-user response, exceptionType={}",
                    exception.getClass().getSimpleName(),
                    exception
            );

            throw exception;
        }
    }

    @PostMapping("/logout")
    @Parameter(
            name = "X-CSRF-TOKEN",
            description = "CSRF Token",
            required = true, // или false в зависимости от ситуации
            in = ParameterIn.HEADER
    )
    public ResponseEntity<Void> logout(
            Authentication authentication,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        new SecurityContextLogoutHandler()
                .logout(request, response, authentication);

        return ResponseEntity.noContent().build();
    }
}
