package com.example.backendfin4gd.controller.product;

import com.example.backendfin4gd.dto.product.StockOverviewResponse;
import com.example.backendfin4gd.security.AdilUserPrincipal;

import com.example.backendfin4gd.service.product.StockAggregationService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/stock")
@RequiredArgsConstructor
public class StockController {

    private final StockAggregationService stockAggregationService;

    /**
     * Получение складских остатков по всем организациям
     * текущего авторизованного пользователя.
     */
    @Parameter(
            name = "X-CSRF-TOKEN",
            description = "CSRF Token",
            required = true,
            in = ParameterIn.HEADER
    )
    @GetMapping("/overview")
    public StockOverviewResponse getStockOverview(
            @AuthenticationPrincipal AdilUserPrincipal principal
    ) {
        log.info("STOCK OVERVIEW: request received, principalPresent={}",
                principal != null);

        if (principal == null) {
            log.warn("STOCK OVERVIEW: authenticated principal is missing");

            throw new AuthenticationCredentialsNotFoundException(
                    "Authenticated principal is missing"
            );
        }

        log.info("STOCK OVERVIEW: loading stock for userId={}",
                principal.getId());

        StockOverviewResponse response =
                stockAggregationService.getStockOverview(principal.getId());

        log.info(
                "STOCK OVERVIEW: completed, organizationsCount={}, partialData={}",
                response.organizations().size(),
                response.partialData()
        );

        return response;
    }
}
