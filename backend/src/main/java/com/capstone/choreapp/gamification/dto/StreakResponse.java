package com.capstone.choreapp.gamification.dto;

import java.time.LocalDate;

public record StreakResponse(
        int currentStreak,
        int longestStreak,
        LocalDate lastActiveDate
) {
}