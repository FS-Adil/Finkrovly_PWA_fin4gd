package com.example.backendfin4gd.security;

import com.example.backendfin4gd.service.DeviceServiceClient;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.client.RestClientException;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class DeviceSessionValidationFilter extends OncePerRequestFilter {

    private static final String DEVICE_ID_SESSION_KEY =
            "ADIL_BOUND_DEVICE_ID";

    private final DeviceServiceClient deviceServiceClient;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();

        // Регистрация устройства должна быть доступна до его привязки.
        if ("/api/devices/register".equals(path)) {
            return true;
        }

        // CSRF-токен нужен до привязки устройства.
        if ("/api/auth/csrf".equals(path)) {
            return true;
        }

        // При входе устройство ещё может быть не привязано к сессии.
        if ("/api/auth/login".equals(path)) {
            return true;
        }

        if ("/api/devices/current-status".equals(path)) {
            return true;
        }

        // Выход должен работать даже после отзыва устройства.
        return "/api/auth/logout".equals(path);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        log.info(
                "DEVICE FILTER: method={}, path={}, authenticated={}, principalType={}",
                request.getMethod(),
                request.getServletPath(),
                authentication != null && authentication.isAuthenticated(),
                authentication == null
                        ? "null"
                        : authentication.getPrincipal().getClass().getName()
        );

        // Публичные запросы без аутентификации продолжат обрабатываться
        // по обычным правилам Spring Security.
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {

            filterChain.doFilter(request, response);
            return;
        }

        Object principalObject = authentication.getPrincipal();

        // Не разрешаем обходить проверку, если у авторизованного
        // пользователя неожиданный тип principal.
        if (!(principalObject instanceof AdilUserPrincipal principal)) {
            response.sendError(
                    HttpStatus.FORBIDDEN.value(),
                    "Unsupported authenticated principal"
            );
            return;
        }

        HttpSession session = request.getSession(false);

        log.info(
                "DEVICE FILTER: sessionExists={}, sessionIdPresent={}",
                session != null,
                session != null
        );

        if (session == null) {
            response.sendError(
                    HttpStatus.FORBIDDEN.value(),
                    "Session not found"
            );
            return;
        }

        Object deviceIdValue =
                session.getAttribute(DEVICE_ID_SESSION_KEY);

        log.info(
                "DEVICE FILTER: deviceBindingPresent={}, deviceBindingType={}",
                deviceIdValue != null,
                deviceIdValue == null
                        ? "null"
                        : deviceIdValue.getClass().getSimpleName()
        );

        if (deviceIdValue == null) {
            response.sendError(
                    HttpStatus.FORBIDDEN.value(),
                    "No device is bound to this session"
            );
            return;
        }

        UUID deviceId;

        try {
            deviceId = deviceIdValue instanceof UUID uuid
                    ? uuid
                    : UUID.fromString(deviceIdValue.toString());
        } catch (IllegalArgumentException exception) {
            response.sendError(
                    HttpStatus.FORBIDDEN.value(),
                    "Invalid device binding"
            );
            return;
        }

        try {

            log.info("DEVICE FILTER: checking device status");

            boolean active = deviceServiceClient.isDeviceActive(
                    deviceId,
                    principal.getId()
            );

            log.info(
                    "DEVICE FILTER: device status response received, active={}",
                    active
            );

            if (!active) {
                log.warn("DEVICE FILTER: device is inactive");
                response.sendError(
                        HttpStatus.FORBIDDEN.value(),
                        "Device is not active"
                );
                return;
            }

        } catch (RestClientException exception) {

            log.error("DEVICE FILTER: device verification service failed", exception);

            // Если Auth Service недоступен, доступ не предоставляем.
            response.sendError(
                    HttpStatus.SERVICE_UNAVAILABLE.value(),
                    "Device verification service is unavailable"
            );
            return;
        }

        log.info("DEVICE FILTER: validation passed, continuing filter chain");
        filterChain.doFilter(request, response);
    }
}
