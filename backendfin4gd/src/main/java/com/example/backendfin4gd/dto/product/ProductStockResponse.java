package com.example.backendfin4gd.dto.product;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductStockResponse(
        UUID productId,
        String productName,
        BigDecimal quantity,
        String unitOfMeasureCode,
        String unitOfMeasureName,
        BigDecimal unitCost,
        BigDecimal totalCost
) {
}
