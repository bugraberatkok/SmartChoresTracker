package com.capstone.choreapp.group.membership.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateDisplayTitleRequest(
        @NotBlank(message = "Display title is required")
        @Size(max = 40, message = "Display title can be at most 40 characters")
        String displayTitle
) {
}