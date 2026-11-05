package com.example.backendfin4gd.config;

import lombok.Getter;
import lombok.Setter;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.services.data-services")
public class DataServiceRoutingProperties {

    /**
     * Маршруты Data Service.
     * Ключ Map — уникальный organizationCode.
     */
    private Map<String, DataServiceRoute> routes = new HashMap<>();

    @Getter
    @Setter
    public static class DataServiceRoute {

        /**
         * Адрес Data Service.
         */
        private String baseUrl;

        /**
         * Endpoint получения складских остатков.
         */
        private String stockPath;

        private String internalSecret;
    }
}
