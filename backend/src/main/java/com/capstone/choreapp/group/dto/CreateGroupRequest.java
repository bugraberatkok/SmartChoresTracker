package com.capstone.choreapp.group.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateGroupRequest(

        @NotBlank(message = "Group name cannot be blank")
        @Size(max = 50, message = "Group name cannot exceed 100 characters")
        String name,

        @Size(max = 500, message = "Description cannot exceed 500 characters")
        String description,

        @Size(max = 16, message = "Household emoji is too long")
        String emoji
) {
}
