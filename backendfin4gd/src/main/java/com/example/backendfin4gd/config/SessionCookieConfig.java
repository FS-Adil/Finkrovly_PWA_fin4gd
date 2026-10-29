package com.example.backendfin4gd.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

@Configuration
public class SessionCookieConfig {

    @Bean
    public CookieSerializer cookieSerializer(
            @Value("${app.session.cookie-secure}")
            boolean secureCookie,
            @Value("${app.session.cookie-name}")
             String cookieName
    ) {
        DefaultCookieSerializer serializer =
                new DefaultCookieSerializer();

        serializer.setCookieName(cookieName);
        serializer.setCookiePath("/");
        serializer.setUseHttpOnlyCookie(true);
        serializer.setUseSecureCookie(secureCookie);
        serializer.setSameSite("Lax");

        return serializer;
    }
}