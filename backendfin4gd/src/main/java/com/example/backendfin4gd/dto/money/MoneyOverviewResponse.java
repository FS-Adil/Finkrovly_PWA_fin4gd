package com.example.backendfin4gd.dto.money;

import java.math.BigDecimal;
import java.util.List;

public record MoneyOverviewResponse(
        List<OrganizationMoneyResponse> organizations,
        BigDecimal openingBalance,
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal balance,
        boolean partialData
) {}
