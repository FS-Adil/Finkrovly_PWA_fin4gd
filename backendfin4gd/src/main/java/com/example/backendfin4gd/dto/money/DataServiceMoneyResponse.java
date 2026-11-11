package com.example.backendfin4gd.dto.money;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

// Ответ Data Service по одной организации за период [periodFrom, periodTo).
// periodFrom и periodTo должны совпадать с параметрами запроса.
public record DataServiceMoneyResponse(
        UUID organizationId,
        String organizationCode,
        Instant periodFrom,
        Instant periodTo,
        List<CashDeskMoneyResponse> cashDesks
) {}
