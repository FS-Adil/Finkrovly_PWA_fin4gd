package com.example.backendfin4gd.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.session.Session;
import org.springframework.session.events.SessionDestroyedEvent;
import org.springframework.context.event.EventListener;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class DeviceSessionRegistry {

    private static final String DEVICE_SESSIONS_PREFIX =
            "adil:device-sessions:";

    private static final String DEVICE_ID_SESSION_KEY =
            "ADIL_BOUND_DEVICE_ID";

    private final StringRedisTemplate redisTemplate;

    /**
     * Добавляет HTTP-сессию в индекс конкретного устройства.
     */
    public void registerSession(UUID deviceId, String sessionId) {

        if (deviceId == null || sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException(
                    "Device ID and session ID are required"
            );
        }

        String key = getKey(deviceId);

        redisTemplate.opsForSet().add(key, sessionId);

        log.info(
                "Session registered for device. deviceId={}, sessionId={}",
                deviceId,
                sessionId
        );
    }

    /**
     * Удаляет конкретную HTTP-сессию из индекса устройства.
     */
    public void unregisterSession(UUID deviceId, String sessionId) {

        if (deviceId == null || sessionId == null) {
            return;
        }

        String key = getKey(deviceId);

        redisTemplate.opsForSet().remove(key, sessionId);

        Long remaining = redisTemplate.opsForSet().size(key);

        if (remaining == null || remaining == 0) {
            redisTemplate.delete(key);
        }
    }

    /**
     * Удаляет связь после уничтожения HTTP-сессии.
     */
    @EventListener
    public void onSessionDestroyed(SessionDestroyedEvent event) {

        Session session = event.getSession();

        Object deviceValue =
                session.getAttribute(DEVICE_ID_SESSION_KEY);

        if (deviceValue == null) {
            return;
        }

        try {
            UUID deviceId = deviceValue instanceof UUID uuid
                    ? uuid
                    : UUID.fromString(deviceValue.toString());

            unregisterSession(deviceId, session.getId());

        } catch (IllegalArgumentException exception) {

            log.warn(
                    "Invalid device ID in destroyed session. sessionId={}",
                    session.getId()
            );
        }
    }

    public String getKey(UUID deviceId) {
        return DEVICE_SESSIONS_PREFIX + deviceId;
    }
}