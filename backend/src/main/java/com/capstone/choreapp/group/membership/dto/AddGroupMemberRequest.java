package com.capstone.choreapp.group.membership.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AddGroupMemberRequest(

        @NotBlank(message = "Email cannot be blank")
        @Email(message = "Email must be valid")
        String email
) {
}