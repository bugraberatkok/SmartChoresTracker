package com.capstone.choreapp.chore.dto;

import com.capstone.choreapp.chore.entity.ChoreStatus;

import java.time.Instant;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Set;

public record ChoreResponse(
        Long id,
        String title,
        String description,
        Long groupId,
        Long assignedUserId,
        Long createdByUserId,
        ChoreStatus status,
        Integer points,
        String icon,
        boolean recurring,
        Set<DayOfWeek> recurrenceDays,
        Set<LocalDate> completedDates,
        Instant dueDate,
        Instant completedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
