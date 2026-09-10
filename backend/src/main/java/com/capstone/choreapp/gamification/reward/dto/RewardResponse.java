package com.capstone.choreapp.gamification.reward.dto;

import java.time.Instant;

public record RewardResponse(
        Long id,
        String name,
        String description,
        Integer cost,
        boolean active,
        Instant createdAt
) {
}