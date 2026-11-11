package com.example.backendfin4gd.service.money;

import com.example.backendfin4gd.config.DataServiceRoutingProperties;
import com.example.backendfin4gd.dto.UserOrganizationResponse;
import com.example.backendfin4gd.dto.money.DataServiceMoneyResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Objects;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataServiceMoneyClient {

    private final DataServiceRoutingProperties routingProperties;

    public DataServiceMoneyResponse getOrganizationMoney(
            UserOrganizationResponse organization,
            Instant from,
            Instant to
    ) {

        // 1. Проверяем входные данные организации.
        if (organization == null
                || organization.organizationId() == null
                || organization.organizationCode() == null
                || organization.organizationCode().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Некорректные данные организации"
            );
        }

        String organizationCode = organization.organizationCode();

        log.debug(
                "--> getOrganizationMoney --> organizationCode: {}",
                organizationCode
        );

        // 2. Ищем маршрут Data Service.
        DataServiceRoutingProperties.DataServiceRoute route =
                routingProperties.getRoutes().get(organizationCode);

        if (route == null) {

            log.warn(
                    "Data Service route not configured for organization: {}",
                    organizationCode
            );

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Маршрут Data Service не настроен"
            );
        }

        // 3. Проверяем настройки маршрута.
        if (route.getBaseUrl() == null
                || route.getBaseUrl().isBlank()
                || route.getMoneyPath() == null
                || route.getMoneyPath().isBlank()
                || route.getInternalSecret() == null
                || route.getInternalSecret().isBlank()) {

            log.error(
                    "Invalid Data Service route configuration: {}",
                    organizationCode
            );

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Некорректная конфигурация Data Service"
            );
        }

        try {

            log.info(
                    "-->getOrganizationMoney-->{}-->{}",
                    route.getBaseUrl(),
                    route.getMoneyPath()
            );

            // 4. Выполняем запрос с внутренним секретом и периодом.
            DataServiceMoneyResponse response = RestClient
                    .create(route.getBaseUrl())
                    .get()
                    .uri(uriBuilder -> uriBuilder
                            .path(route.getMoneyPath())
                            .queryParam("from", from.toString())
                            .queryParam("to", to.toString())
                            .build())
                    .header(
                            "X-Internal-Service-Secret",
                            route.getInternalSecret()
                    )
                    .retrieve()
                    .body(DataServiceMoneyResponse.class);

            // 5. Проверяем ответ.
            if (response == null) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Data Service вернул пустой ответ"
                );
            }

            // 6. Проверяем принадлежность ответа организации.
            if (!Objects.equals(
                    organization.organizationId(),
                    response.organizationId()
            ) || !Objects.equals(
                    organization.organizationCode(),
                    response.organizationCode()
            )) {

                log.error(
                        "Organization mismatch. Requested: {}, returned: {}",
                        organizationCode,
                        response.organizationCode()
                );

                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Data Service вернул данные другой организации"
                );
            }

            // 6.1. Проверяем, что Data Service вернул данные за запрошенный период.
            if (!Objects.equals(from, response.periodFrom())
                    || !Objects.equals(to, response.periodTo())) {

                log.error(
                        "Period mismatch for organization: {}. Requested: [{}, {}), returned: [{}, {})",
                        organizationCode,
                        from,
                        to,
                        response.periodFrom(),
                        response.periodTo()
                );

                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Data Service вернул данные за другой период"
                );
            }


            log.debug(
                    "Money successfully loaded for organization: {}",
                    organizationCode
            );

            return response;

        } catch (RestClientException exception) {

            log.error(
                    "Data Service request failed for organization: {}",
                    organizationCode,
                    exception
            );

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Не удалось получить данные из Data Service"
            );
        }
    }
}

