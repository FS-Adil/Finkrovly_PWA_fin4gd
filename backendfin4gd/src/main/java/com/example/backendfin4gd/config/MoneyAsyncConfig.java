package com.example.backendfin4gd.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
public class MoneyAsyncConfig {

    @Bean(name = "moneyExecutor")
    public Executor moneyExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        // Базовое количество параллельных задач.
        executor.setCorePoolSize(4);

        // Максимум одновременных задач при высокой нагрузке.
        executor.setMaxPoolSize(8);

        // Очередь задач, пока потоки заняты.
        executor.setQueueCapacity(100);

        executor.setThreadNamePrefix("money-");
        executor.initialize();

        return executor;
    }
}
