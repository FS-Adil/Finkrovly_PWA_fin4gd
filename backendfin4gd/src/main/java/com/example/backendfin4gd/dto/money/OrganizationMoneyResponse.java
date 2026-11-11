package com.example.backendfin4gd.dto.money;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record OrganizationMoneyResponse(
        UUID organizationId,
        String organizationCode,
        boolean dataLoaded,
        String loadingError,
        List<CashDeskMoneyResponse> cashDesks,
        BigDecimal openingBalance,
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal balance
) {}
