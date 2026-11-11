package com.example.backendfin4gd.dto.money;

import java.math.BigDecimal;
import java.util.List;

public record CashDeskMoneyResponse(
        String cashDeskId,
        String cashDeskName,
        List<CashFlowItemMoneyResponse> items,
        BigDecimal openingBalance,
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal balance
) {}
