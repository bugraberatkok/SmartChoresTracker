package com.capstone.choreapp.group.membership.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JoinGroupByCodeRequest(

        @NotBlank(message = "Invite code is required")
        @Size(min = 6, max = 12, message = "Invalid invite code")
        String inviteCode

) {
}