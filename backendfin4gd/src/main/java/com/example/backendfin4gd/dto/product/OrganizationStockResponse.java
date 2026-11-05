package com.example.backendfin4gd.dto.product;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record OrganizationStockResponse(
        UUID organizationId,
        String organizationCode,
        boolean dataLoaded,
        String loadingError,
        List<WarehouseStockResponse> warehouses,
        List<QuantityByUnitResponse> totalQuantities,
        BigDecimal totalCost
) {
}
