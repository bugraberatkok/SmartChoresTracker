package com.capstone.choreapp.gamification.dto;

public record LeaderboardEntryResponse(
        Long userId,
        String name,
        int totalPoints,
        int completedChores,
        int rank
) {
}