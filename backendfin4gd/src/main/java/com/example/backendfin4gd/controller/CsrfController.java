package com.example.backendfin4gd.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "Управление авторизацией Fin For GD BFF", description = "API для получение csrf token")
@RestController
public class CsrfController {

    @Operation(summary = "Проверка здоровья", description = "Тестирование")
    @GetMapping("/api/auth/csrf")
    public Map<String, String> csrf(CsrfToken csrfToken) {
        return Map.of(
                "headerName", csrfToken.getHeaderName(),
                "token", csrfToken.getToken()
        );
    }
}
