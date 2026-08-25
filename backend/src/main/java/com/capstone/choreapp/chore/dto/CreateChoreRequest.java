package com.capstone.choreapp.chore.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record CreateChoreRequest(

        @NotBlank(message = "Title cannot be blank")
        @Size(max = 150, message = "Title cannot exceed 150 characters")
        String title,

        @Size(max = 500, message = "Description cannot exceed 500 characters")
        String description,

        Long assignedUserId,

        @Min(value = 0, message = "Points cannot be negative")
        Integer points,

        Instant dueDate
) {
}