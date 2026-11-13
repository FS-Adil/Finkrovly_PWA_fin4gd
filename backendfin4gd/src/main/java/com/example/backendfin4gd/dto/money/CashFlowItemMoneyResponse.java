package com.example.backendfin4gd.dto.money;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.List;

public record CashFlowItemMoneyResponse(
        String itemId,
        String itemName,
        BigDecimal income,
        BigDecimal expense,
        BigDecimal balance,

        @JsonProperty(defaultValue = "[]")
        List<MoneyDocumentResponse>documents
) {}
