package com.example.backendfin4gd.controller.money;

import com.example.backendfin4gd.dto.money.MoneyOverviewResponse;
import com.example.backendfin4gd.security.AdilUserPrincipal;
import com.example.backendfin4gd.service.money.MoneyAggregationService;

import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;

@Slf4j
@RestController
@RequestMapping("/api/money")
@RequiredArgsConstructor
public class MoneyController {

    private final MoneyAggregationService moneyAggregationService;

    @GetMapping("/overview")
    public MoneyOverviewResponse getOverview(
            @AuthenticationPrincipal AdilUserPrincipal principal,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            OffsetDateTime from,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            OffsetDateTime to
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

        MoneyOverviewResponse response = moneyAggregationService.getMoneyOverview(
                principal.getId(),
                from.toInstant(),
                to.toInstant()
        );

        log.info(
                "STOCK OVERVIEW: completed, organizationsCount={}, partialData={}",
                response.organizations().size(),
                response.partialData()
        );

        return response;
    }
}
