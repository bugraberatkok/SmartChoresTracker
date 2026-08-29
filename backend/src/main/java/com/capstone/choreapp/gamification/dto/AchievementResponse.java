package com.capstone.choreapp.gamification.dto;

public record AchievementResponse(
        String code,
        String name,
        String description,
        String icon,
        int requiredValue,
        int currentValue,
        boolean earned
) {
}