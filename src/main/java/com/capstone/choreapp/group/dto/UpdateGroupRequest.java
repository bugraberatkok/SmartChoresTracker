package com.capstone.choreapp.group.dto;

import jakarta.validation.constraints.Size;

public record UpdateGroupRequest(

        @Size(min = 1, max = 100, message = "Group name must be between 1 and 100 characters")
        String name,

        @Size(max = 500, message = "Description cannot exceed 500 characters")
        String description
) {
}