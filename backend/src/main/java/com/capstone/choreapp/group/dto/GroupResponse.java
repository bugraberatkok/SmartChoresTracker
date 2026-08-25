package com.capstone.choreapp.group.dto;

import java.time.Instant;

public record GroupResponse(
        Long id,
        String name,
        String description,
        Long ownerId,
        Instant createdAt,
        Instant updatedAt
) {
}