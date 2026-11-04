package com.example.backendfin4gd.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceSessionRevocationService {

    private final StringRedisTemplate redisTemplate;

    private final SessionRepository<? extends Session> sessionRepository;

    private final DeviceSessionRegistry deviceSessionRegistry;

    /**
     * Удаляет все HTTP-сессии, связанные с конкретным устройством.
     *
     * Сессии других устройств пользователя не затрагиваются.
     *
     * @return количество найденных и отозванных сессий
     */
    public int revokeDeviceSessions(UUID deviceId) {

        String key = deviceSessionRegistry.getKey(deviceId);

        Set<String> sessionIds =
                redisTemplate.opsForSet().members(key);

        if (sessionIds == null || sessionIds.isEmpty()) {

            redisTemplate.delete(key);

            log.info(
                    "No sessions found for device. deviceId={}",
                    deviceId
            );

            return 0;
        }

        int revokedCount = 0;

        for (String sessionId : sessionIds) {

            Session session =
                    sessionRepository.findById(sessionId);

            if (session != null) {

                sessionRepository.deleteById(sessionId);

                revokedCount++;

                log.info(
                        "Session revoked. deviceId={}, sessionId={}",
                        deviceId,
                        sessionId
                );
            }
        }

        // Удаляем индекс устройства после обработки всех сессий.
        redisTemplate.delete(key);

        log.info(
                "Device sessions revoked. deviceId={}, revokedCount={}",
                deviceId,
                revokedCount
        );

        return revokedCount;
    }
}