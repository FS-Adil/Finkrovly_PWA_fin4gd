package com.example.backendfin4gd.config;

import com.example.backendfin4gd.security.DeviceSessionValidationFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@EnableMethodSecurity
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public CsrfTokenRepository csrfTokenRepository() {
        return new HttpSessionCsrfTokenRepository();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            SecurityContextRepository securityContextRepository,
            CsrfTokenRepository csrfTokenRepository,
            DeviceSessionValidationFilter deviceSessionValidationFilter
    ) throws Exception {

        http
                // ==================== CORS ====================
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                .securityContext(context -> context
                        .securityContextRepository(securityContextRepository)
                        .requireExplicitSave(true)
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                )
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository)
                )
                .addFilterAfter(
                        deviceSessionValidationFilter,
                        SecurityContextHolderFilter.class
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/swagger-ui.html",
                                "/swagger-ui/**",
                                "/v3/api-docs",
                                "/v3/api-docs/**",
                                "/v3/api-docs.yaml",
                                "/swagger-resources/**",
                                "/webjars/**",
                                "/error",

                                "/api/health",
                                "/api/auth/csrf",
                                "/api/auth/login"
                        ).permitAll()
                        .anyRequest().authenticated()
                );

        return http.build();
    }

    @Bean
    public FilterRegistrationBean<DeviceSessionValidationFilter>
    deviceSessionValidationFilterRegistration(
            DeviceSessionValidationFilter filter
    ) {
        FilterRegistrationBean<DeviceSessionValidationFilter> registration =
                new FilterRegistrationBean<>(filter);

        registration.setEnabled(false);

        return registration;
    }

    /**
     * Конфигурация CORS.
     * Разрешает запросы только с доверенных доменов.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Разрешенные источники (в production - конкретные домены)
        configuration.setAllowedOrigins(List.of(
                "http://localhost:5000", "https://pwa.rolls.finkrovl.ru", "http://localhost:4173")
        );

        // Разрешенные HTTP методы
        configuration.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));

//        configuration.setAllowedHeaders(Arrays.asList("*"));

        configuration.setAllowedHeaders(Arrays.asList(
                "Content-Type",
                "X-CSRF-TOKEN",
                "Authorization",
                "Accept",
                "Origin",
                "X-Requested-With",
                "User-Agent"
        ));

        // Разрешить отправку кук
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
