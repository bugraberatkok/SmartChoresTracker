package com.capstone.choreapp.gamification.dto;

import java.time.LocalDate;

public record ProgressDayResponse(
        LocalDate date,
        String day,
        int completedChores
) {
}