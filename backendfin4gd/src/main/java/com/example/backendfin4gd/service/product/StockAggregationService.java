package com.example.backendfin4gd.service.product;

import com.example.backendfin4gd.dto.UserOrganizationResponse;

import com.example.backendfin4gd.dto.product.*;
import com.example.backendfin4gd.service.AuthOrganizationServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockAggregationService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final AuthOrganizationServiceClient authOrganizationServiceClient;
    private final DataServiceStockClient dataServiceStockClient;

    /**
     * Получение складских остатков всех активных организаций пользователя.
     */
    public StockOverviewResponse getStockOverview(UUID userId) {

        if (userId == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not authenticated"
            );
        }

        log.debug("--> getStockOverview --> userId: {}", userId);

        // Получаем активные организации исключительно через Auth Service.
        List<UserOrganizationResponse> organizations =
                authOrganizationServiceClient.getUserOrganizations(userId);

        if (organizations == null || organizations.isEmpty()) {
            return emptyOverview();
        }

        List<OrganizationStockResponse> organizationResults =
                new ArrayList<>();

        QuantityAccumulator globalQuantities =
                new QuantityAccumulator();

        BigDecimal globalTotalCost = ZERO;

        // Каждая организация загружается независимо.
        for (UserOrganizationResponse organization : organizations) {

            if (organization == null
                    || organization.organizationId() == null
                    || organization.organizationCode() == null
                    || organization.organizationCode().isBlank()) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Auth Service returned invalid organization data"
                );
            }

            try {

                // Получаем данные конкретной организации.
                DataServiceStockResponse data =
                        dataServiceStockClient.getOrganizationStock(organization);

                if (data == null) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY,
                            "Data Service returned an empty response"
                    );
                }

                // Рассчитываем показатели организации.
                OrganizationStockResponse result =
                        aggregateOrganization(organization, data);

                organizationResults.add(result);

                // В общие итоги включаем только успешно загруженные данные.
                addQuantities(
                        globalQuantities,
                        result.totalQuantities()
                );

                globalTotalCost = globalTotalCost.add(
                        result.totalCost()
                );

            } catch (ResponseStatusException exception) {

                // Ошибка одной организации не прерывает загрузку остальных.
                log.warn(
                        "Stock data unavailable for organization: {}. Reason: {}",
                        organization.organizationCode(),
                        exception.getReason()
                );

                organizationResults.add(
                        unavailableOrganization(
                                organization,
                                exception.getReason()
                        )
                );
            }
        }

        boolean partialData = organizationResults.stream()
                .anyMatch(organization -> !organization.dataLoaded());

        return new StockOverviewResponse(
                organizationResults,
                globalQuantities.toResponse(),
                globalTotalCost,
                partialData
        );
    }

    /**
     * Агрегация одной успешно загруженной организации.
     */
    private OrganizationStockResponse aggregateOrganization(
            UserOrganizationResponse organization,
            DataServiceStockResponse data
    ) {

        List<WarehouseStockResponse> warehouseResults =
                new ArrayList<>();

        QuantityAccumulator organizationQuantities =
                new QuantityAccumulator();

        BigDecimal organizationTotalCost = ZERO;

        if (data.warehouses() != null) {

            for (WarehouseStockResponse warehouse : data.warehouses()) {

                if (warehouse == null) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY,
                            "Data Service returned an invalid warehouse"
                    );
                }

                WarehouseStockResponse warehouseResult =
                        aggregateWarehouse(warehouse);

                warehouseResults.add(warehouseResult);

                addQuantities(
                        organizationQuantities,
                        warehouseResult.totalQuantities()
                );

                organizationTotalCost = organizationTotalCost.add(
                        warehouseResult.totalCost()
                );
            }
        }

        return new OrganizationStockResponse(
                organization.organizationId(),
                organization.organizationCode(),
                true,
                null,
                warehouseResults,
                organizationQuantities.toResponse(),
                organizationTotalCost
        );
    }

    /**
     * Агрегация одного склада.
     */
    private WarehouseStockResponse aggregateWarehouse(
            WarehouseStockResponse warehouse
    ) {
        if (warehouse.warehouseId() == null
                || warehouse.warehouseName() == null
                || warehouse.warehouseName().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Data Service returned incomplete warehouse data"
            );
        }

        List<ProductStockResponse> productResults =
                new ArrayList<>();

        QuantityAccumulator warehouseQuantities =
                new QuantityAccumulator();

        BigDecimal warehouseTotalCost = ZERO;

        if (warehouse.products() != null) {

            for (ProductStockResponse product : warehouse.products()) {

                if (product == null) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY,
                            "Data Service returned an invalid product"
                    );
                }

                validateProduct(product);

                // Стоимость товара рассчитывается на стороне BFF.
                BigDecimal productTotalCost = product.quantity()
                        .multiply(product.unitCost());

                ProductStockResponse productResult =
                        new ProductStockResponse(
                                product.productId(),
                                product.productName(),
                                product.quantity(),
                                product.unitOfMeasureCode(),
                                product.unitOfMeasureName(),
                                product.unitCost(),
                                productTotalCost
                        );

                productResults.add(productResult);

                warehouseQuantities.add(
                        product.unitOfMeasureCode(),
                        product.unitOfMeasureName(),
                        product.quantity()
                );

                warehouseTotalCost = warehouseTotalCost.add(
                        productTotalCost
                );
            }
        }

        return new WarehouseStockResponse(
                warehouse.warehouseId(),
                warehouse.warehouseName(),
                productResults,
                warehouseQuantities.toResponse(),
                warehouseTotalCost
        );
    }

    /**
     * Проверка обязательных полей товара.
     */
    private void validateProduct(ProductStockResponse product) {

        if (product.productName() == null
                || product.productName().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Data Service returned incomplete product name"
            );
        }

        if (product.productId() == null
                || product.quantity() == null
                || product.unitCost() == null
                || product.unitOfMeasureCode() == null
                || product.unitOfMeasureCode().isBlank()
                || product.unitOfMeasureName() == null
                || product.unitOfMeasureName().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Data Service returned incomplete product data"
            );
        }

        if (product.unitCost().signum() < 0) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Product unit cost cannot be negative"
            );
        }
    }

    /**
     * Формирование результата для организации,
     * данные которой не удалось загрузить.
     */
    private OrganizationStockResponse unavailableOrganization(
            UserOrganizationResponse organization,
            String reason
    ) {

        return new OrganizationStockResponse(
                organization.organizationId(),
                organization.organizationCode(),
                false,
                reason != null ? reason : "Данные не загружены",
                List.of(),
                List.of(),
                ZERO
        );
    }

    /**
     * Добавление количественных итогов.
     */
    private void addQuantities(
            QuantityAccumulator accumulator,
            List<QuantityByUnitResponse> quantities
    ) {

        if (quantities == null) {
            return;
        }

        for (QuantityByUnitResponse quantity : quantities) {

            accumulator.add(
                    quantity.unitOfMeasureCode(),
                    quantity.unitOfMeasureName(),
                    quantity.quantity()
            );
        }
    }

    /**
     * Пустой ответ при отсутствии активных организаций.
     */
    private StockOverviewResponse emptyOverview() {

        return new StockOverviewResponse(
                List.of(),
                List.of(),
                ZERO,
                false
        );
    }

    /**
     * Накопление количества по единицам измерения.
     */
    private static class QuantityAccumulator {

        private final Map<String, UnitTotal> totals =
                new LinkedHashMap<>();

        private void add(
                String unitCode,
                String unitName,
                BigDecimal quantity
        ) {

            if (unitCode == null
                    || unitName == null
                    || quantity == null) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Invalid quantity aggregation data"
                );
            }

            UnitTotal total = totals.get(unitCode);

            if (total == null) {

                totals.put(
                        unitCode,
                        new UnitTotal(unitName, quantity)
                );

                return;
            }

            if (!total.unitName.equals(unitName)) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Inconsistent unit of measure name: " + unitCode
                );
            }

            total.quantity = total.quantity.add(quantity);
        }

        private List<QuantityByUnitResponse> toResponse() {

            List<QuantityByUnitResponse> result =
                    new ArrayList<>();

            totals.forEach((code, total) ->
                    result.add(
                            new QuantityByUnitResponse(
                                    code,
                                    total.unitName,
                                    total.quantity
                            )
                    )
            );

            return result;
        }
    }

    /**
     * Внутреннее значение для накопления количества.
     */
    private static class UnitTotal {

        private final String unitName;
        private BigDecimal quantity;

        private UnitTotal(
                String unitName,
                BigDecimal quantity
        ) {
            this.unitName = unitName;
            this.quantity = quantity;
        }
    }
}