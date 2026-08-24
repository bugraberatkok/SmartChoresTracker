package com.capstone.choreapp.chore.dto;

import com.capstone.choreapp.chore.entity.ChoreStatus;

import java.time.Instant;

public record ChoreResponse(
        Long id,
        String title,
        String description,
        Long groupId,
        Long assignedUserId,
        Long createdByUserId,
        ChoreStatus status,
        Integer points,
        Instant dueDate,
        Instant completedAt,
        Instant createdAt,
        Instant updatedAt
) {
}