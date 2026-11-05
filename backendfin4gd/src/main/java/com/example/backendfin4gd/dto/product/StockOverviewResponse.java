package com.example.backendfin4gd.dto.product;

import java.math.BigDecimal;
import java.util.List;

public record StockOverviewResponse(
        List<OrganizationStockResponse> organizations,
        List<QuantityByUnitResponse> totalQuantities,
        BigDecimal totalCost,
        boolean partialData
) {
}
