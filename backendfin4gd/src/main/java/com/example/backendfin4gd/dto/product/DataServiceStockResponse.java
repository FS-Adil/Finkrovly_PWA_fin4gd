package com.example.backendfin4gd.dto.product;

import java.util.List;
import java.util.UUID;

public record DataServiceStockResponse(
        UUID organizationId,
        String organizationCode,
        List<WarehouseStockResponse> warehouses
) {
}
