package com.capstone.choreapp.group.dto;

import java.time.Instant;

public record GroupResponse(
        Long id,
        String name,
        String description,
        String emoji,
        Long ownerId,
        String inviteCode,
        Instant createdAt,
        Instant updatedAt
) {
}
