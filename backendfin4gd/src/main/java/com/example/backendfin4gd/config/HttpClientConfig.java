package com.example.backendfin4gd.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class HttpClientConfig {

//    @Bean
//    public RestClient.Builder restClientBuilder() {
//        return RestClient.builder();
//    }
    @Bean
    public RestClient.Builder restClientBuilder() {
        SimpleClientHttpRequestFactory requestFactory =
                new SimpleClientHttpRequestFactory();

        // Ограничение на подключение к Data Service.
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));

        // Ограничение ожидания ответа от Data Service.
        requestFactory.setReadTimeout(Duration.ofSeconds(10));

        return RestClient.builder()
                .requestFactory(requestFactory);
    }

}
