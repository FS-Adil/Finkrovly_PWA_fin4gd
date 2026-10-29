package com.example.backendfin4gd.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "Управление авторизацией Fin For GD BFF", description = "API для работы с авторизацией Fin For GD BFF")
@RestController
public class HealthController {

    @Operation(summary = "Проверка здоровья", description = "Тестирование")
    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of(
                "service", "adil-fintech-bff",
                "status", "UP"
        );
    }
}
