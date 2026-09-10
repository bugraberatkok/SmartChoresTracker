package com.capstone.choreapp.activity.dto;

import com.capstone.choreapp.activity.entity.ActivityType;

import java.time.Instant;

public record ActivityResponse(
        Long id,
        ActivityType type,
        Long actorUserId,
        String actorName,
        Long choreId,
        String choreTitle,
        Instant createdAt
) {
}