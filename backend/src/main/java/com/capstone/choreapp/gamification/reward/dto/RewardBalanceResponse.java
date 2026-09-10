package com.capstone.choreapp.gamification.reward.dto;

public record RewardBalanceResponse(
        int earnedPoints,
        int spentPoints,
        int availablePoints
) {
}