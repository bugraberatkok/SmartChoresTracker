package com.capstone.choreapp.group.membership.dto;

import java.time.Instant;

public record GroupJoinRequestResponse(
        Long requestId,
        Long groupId,
        String groupName,
        Long userId,
        String name,
        String email,
        Instant requestedAt
) {}
