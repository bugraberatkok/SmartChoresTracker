package com.capstone.choreapp.chore.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record UpdateChoreRequest(

        @Size(min = 1, max = 150,
                message = "Title must be between 1 and 150 characters")
        String title,

        @Size(max = 500,
                message = "Description cannot exceed 500 characters")
        String description,

        Long assignedUserId,

        @Min(value = 0, message = "Points cannot be negative")
        Integer points,

        Instant dueDate
) {
}