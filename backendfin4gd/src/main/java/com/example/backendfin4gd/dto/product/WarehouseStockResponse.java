package com.example.backendfin4gd.dto.product;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record WarehouseStockResponse(
        UUID warehouseId,
        String warehouseName,
        List<ProductStockResponse> products,
        List<QuantityByUnitResponse> totalQuantities,
        BigDecimal totalCost
) {
}
