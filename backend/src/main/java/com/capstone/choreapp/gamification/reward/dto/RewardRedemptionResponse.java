package com.capstone.choreapp.gamification.reward.dto;

import java.time.Instant;

public record RewardRedemptionResponse(
        Long redemptionId,
        Long rewardId,
        String rewardName,
        int cost,
        int remainingPoints,
        Instant redeemedAt
) {
}