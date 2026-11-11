package com.example.backendfin4gd.dto.money;

import java.math.BigDecimal;

public record CashFlowItemMoneyResponse(
        String itemId,
        String itemName,
        BigDecimal income,
        BigDecimal expense,
        BigDecimal balance
) {}
