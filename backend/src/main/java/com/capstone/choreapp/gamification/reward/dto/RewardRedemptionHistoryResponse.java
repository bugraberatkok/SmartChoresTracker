package com.capstone.choreapp.gamification.reward.dto;

import java.time.Instant;

public record RewardRedemptionHistoryResponse(
        Long redemptionId,
        Long rewardId,
        String rewardName,
        Integer cost,
        Instant redeemedAt
) {}
