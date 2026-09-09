package com.capstone.choreapp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.ZoneId;

@Configuration
public class TimeConfig {

    @Bean
    public ZoneId applicationZoneId(
            @Value("${app.time-zone}") String timeZone
    ) {
        return ZoneId.of(timeZone);
    }
}