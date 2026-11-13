package com.example.backendfin4gd.service.money;

import com.example.backendfin4gd.dto.UserOrganizationResponse;
import com.example.backendfin4gd.dto.money.*;
import com.example.backendfin4gd.service.AuthOrganizationServiceClient;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MoneyAggregationService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final String NO_ITEM_ID = "no-item";
    private static final String NO_ITEM_NAME = "Без статьи";

    private static final String INVALID_ORGANIZATION_REASON =
            "Некорректные данные организации в Auth Service";
    private static final String INTERNAL_ERROR_REASON =
            "Внутренняя ошибка при обработке данных организации";

    private final AuthOrganizationServiceClient authOrganizationServiceClient;
    private final DataServiceMoneyClient dataServiceMoneyClient;

    /**
     * Получение денежных средств всех организаций пользователя за период [from, to).
     *
     * Ошибка одной организации (в том числе некорректные данные из Auth Service
     * или из Data Service) не прерывает запрос: такая организация попадает
     * в ответ с dataLoaded = false.
     *
     * Прерывается запрос целиком только если не удалось получить список
     * организаций или период задан неверно.
     */
    public MoneyOverviewResponse getMoneyOverview(
            UUID userId,
            Instant from,
            Instant to
    ) {

        if (userId == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not authenticated"
            );
        }

        if (from == null || to == null || !from.isBefore(to)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Некорректный период"
            );
        }

        log.debug("--> getMoneyOverview --> userId: {}, period: [{}, {})",
                userId, from, to);

        // Получаем активные организации исключительно через Auth Service.
        List<UserOrganizationResponse> organizations =
                authOrganizationServiceClient.getUserOrganizations(userId);

        if (organizations == null || organizations.isEmpty()) {
            return new MoneyOverviewResponse(
                    List.of(), ZERO, ZERO, ZERO, ZERO, false
            );
        }

        List<OrganizationMoneyResponse> organizationResults =
                new ArrayList<>();

        BigDecimal globalOpening = ZERO;
        BigDecimal globalIncome = ZERO;
        BigDecimal globalExpense = ZERO;

        // Каждая организация загружается независимо.
        for (UserOrganizationResponse organization : organizations) {

            // Некорректная организация не прерывает запрос,
            // а отображается как «данные не загружены».
            if (!isValidOrganization(organization)) {

                log.warn(
                        "Auth Service returned invalid organization data: {}",
                        organization
                );

                organizationResults.add(
                        unavailableOrganization(
                                organization,
                                INVALID_ORGANIZATION_REASON
                        )
                );

                continue;
            }

            try {

                DataServiceMoneyResponse data =
                        dataServiceMoneyClient.getOrganizationMoney(
                                organization, from, to
                        );

                OrganizationMoneyResponse result =
                        aggregateOrganization(organization, data);

                organizationResults.add(result);

                // В общие итоги включаем только успешно загруженные данные.
                globalOpening = globalOpening.add(result.openingBalance());
                globalIncome = globalIncome.add(result.totalIncome());
                globalExpense = globalExpense.add(result.totalExpense());

            } catch (ResponseStatusException exception) {

                log.warn(
                        "Money data unavailable for organization: {}. Reason: {}",
                        organization.organizationCode(),
                        exception.getReason()
                );

                organizationResults.add(
                        unavailableOrganization(
                                organization,
                                exception.getReason()
                        )
                );

            } catch (RuntimeException exception) {

                // Страховка: любая неожиданная ошибка остаётся
                // внутри одной организации.
                log.error(
                        "Unexpected error while loading money for organization: {}",
                        organization.organizationCode(),
                        exception
                );

                organizationResults.add(
                        unavailableOrganization(
                                organization,
                                INTERNAL_ERROR_REASON
                        )
                );
            }
        }

        boolean partialData = organizationResults.stream()
                .anyMatch(organization -> !organization.dataLoaded());

        return new MoneyOverviewResponse(
                organizationResults,
                globalOpening,
                globalIncome,
                globalExpense,
                globalOpening.add(globalIncome).subtract(globalExpense),
                partialData
        );
    }

    /**
     * Проверка данных организации из Auth Service.
     */
    private boolean isValidOrganization(UserOrganizationResponse organization) {

        return organization != null
                && organization.organizationId() != null
                && organization.organizationCode() != null
                && !organization.organizationCode().isBlank();
    }

    /**
     * Агрегация одной успешно загруженной организации.
     */
    private OrganizationMoneyResponse aggregateOrganization(
            UserOrganizationResponse organization,
            DataServiceMoneyResponse data
    ) {

        List<CashDeskMoneyResponse> cashDeskResults = new ArrayList<>();

        BigDecimal organizationOpening = ZERO;
        BigDecimal organizationIncome = ZERO;
        BigDecimal organizationExpense = ZERO;

        if (data.cashDesks() != null) {

            for (CashDeskMoneyResponse cashDesk : data.cashDesks()) {

                if (cashDesk == null) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY,
                            "Data Service returned an invalid cash desk"
                    );
                }

                CashDeskMoneyResponse cashDeskResult =
                        aggregateCashDesk(cashDesk);

                cashDeskResults.add(cashDeskResult);

                organizationOpening = organizationOpening.add(
                        cashDeskResult.openingBalance()
                );
                organizationIncome = organizationIncome.add(
                        cashDeskResult.totalIncome()
                );
                organizationExpense = organizationExpense.add(
                        cashDeskResult.totalExpense()
                );
            }
        }

        return new OrganizationMoneyResponse(
                organization.organizationId(),
                organization.organizationCode(),
                true,
                null,
                cashDeskResults,
                organizationOpening,
                organizationIncome,
                organizationExpense,
                organizationOpening
                        .add(organizationIncome)
                        .subtract(organizationExpense)
        );
    }

    /**
     * Агрегация одной кассы.
     */
    private CashDeskMoneyResponse aggregateCashDesk(
            CashDeskMoneyResponse cashDesk
    ) {

        if (cashDesk.cashDeskId() == null
                || cashDesk.cashDeskName() == null
                || cashDesk.cashDeskName().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Data Service returned incomplete cash desk data"
            );
        }

        if (cashDesk.openingBalance() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Data Service returned cash desk without opening balance"
            );
        }

        List<CashFlowItemMoneyResponse> itemResults = new ArrayList<>();

        BigDecimal cashDeskIncome = ZERO;
        BigDecimal cashDeskExpense = ZERO;

        // Движения без статьи собираются в одну строку.
        boolean hasNoItem = false;
        BigDecimal noItemIncome = ZERO;
        BigDecimal noItemExpense = ZERO;

        List<MoneyDocumentResponse> noItemDocuments = new ArrayList<>();

        if (cashDesk.items() != null) {

            for (CashFlowItemMoneyResponse item : cashDesk.items()) {

                if (item == null) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY,
                            "Data Service returned an invalid cash flow item"
                    );
                }

                validateItem(item);

                cashDeskIncome = cashDeskIncome.add(item.income());
                cashDeskExpense = cashDeskExpense.add(item.expense());

                if (item.itemId() == null || item.itemId().isBlank()) {

                    hasNoItem = true;
                    noItemIncome = noItemIncome.add(item.income());
                    noItemExpense = noItemExpense.add(item.expense());

                    if (item.documents() != null) {
                        noItemDocuments.addAll(item.documents());
                    }

                    continue;
                }

                String itemName =
                        item.itemName() == null || item.itemName().isBlank()
                                ? NO_ITEM_NAME
                                : item.itemName();

                // Сальдо по статье рассчитывается на стороне BFF.
                itemResults.add(
                        new CashFlowItemMoneyResponse(
                                item.itemId(),
                                itemName,
                                item.income(),
                                item.expense(),
                                item.income().subtract(item.expense()),
                                item.documents() == null ? List.of() : item.documents()
                        )
                );
            }
        }

        if (hasNoItem) {

            itemResults.add(
                    new CashFlowItemMoneyResponse(
                            NO_ITEM_ID,
                            NO_ITEM_NAME,
                            noItemIncome,
                            noItemExpense,
                            noItemIncome.subtract(noItemExpense),
                            noItemDocuments
                    )
            );
        }

        return new CashDeskMoneyResponse(
                cashDesk.cashDeskId(),
                cashDesk.cashDeskName(),
                itemResults,
                cashDesk.openingBalance(),
                cashDeskIncome,
                cashDeskExpense,
                cashDesk.openingBalance()
                        .add(cashDeskIncome)
                        .subtract(cashDeskExpense)
        );
    }

    /**
     * Проверка сумм статьи.
     */
//    private void validateItem(CashFlowItemMoneyResponse item) {
//
//        if (item.income() == null || item.expense() == null) {
//
//            throw new ResponseStatusException(
//                    HttpStatus.BAD_GATEWAY,
//                    "Data Service returned incomplete cash flow item data"
//            );
//        }
//
//        if (item.income().signum() < 0 || item.expense().signum() < 0) {
//
//            throw new ResponseStatusException(
//                    HttpStatus.BAD_GATEWAY,
//                    "Income and expense cannot be negative"
//            );
//        }
//    }

    private void validateItem(CashFlowItemMoneyResponse item) {
        if (item.income() == null || item.expense() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Data Service returned incomplete cash flow item data"
            );
        }

        if (item.income().signum() < 0 || item.expense().signum() < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Income and expense cannot be negative"
            );
        }
    }


    /**
     * Результат для организации, данные которой не удалось загрузить.
     * Организация может быть некорректной, поэтому organization может иметь null-поля.
     */
    private OrganizationMoneyResponse unavailableOrganization(
            UserOrganizationResponse organization,
            String reason
    ) {

        return new OrganizationMoneyResponse(
                organization != null ? organization.organizationId() : null,
                organization != null ? organization.organizationCode() : null,
                false,
                reason != null ? reason : "Данные не загружены",
                List.of(),
                ZERO,
                ZERO,
                ZERO,
                ZERO
        );
    }
}
