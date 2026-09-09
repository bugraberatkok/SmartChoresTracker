package com.capstone.choreapp.group.membership.dto;

import com.capstone.choreapp.group.membership.entity.GroupRole;

import java.time.Instant;

public record GroupMemberResponse(
        Long membershipId,
        Long userId,
        String name,
        String email,
        GroupRole role,
        String displayTitle,
        Instant joinedAt
) {
}