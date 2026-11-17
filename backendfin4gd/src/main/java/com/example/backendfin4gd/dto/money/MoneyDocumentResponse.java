package com.example.backendfin4gd.dto.money;

import java.math.BigDecimal;
import java.time.Instant;

public record MoneyDocumentResponse(
        String documentId,
        String documentNumber,
        Instant documentDate,
        String counterpartyName,
        String documentType,
        String description,
        BigDecimal income,
        BigDecimal expense
) {}

