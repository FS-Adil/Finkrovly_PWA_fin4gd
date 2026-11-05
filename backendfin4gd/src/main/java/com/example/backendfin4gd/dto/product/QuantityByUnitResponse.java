package com.example.backendfin4gd.dto.product;

import java.math.BigDecimal;

public record QuantityByUnitResponse(
        String unitOfMeasureCode,
        String unitOfMeasureName,
        BigDecimal quantity
) {
}
