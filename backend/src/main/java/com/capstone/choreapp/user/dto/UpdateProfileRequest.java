package com.capstone.choreapp.user.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(

        @Size(max = 80, message = "Name must be at most 80 characters")
        String name,

        @Pattern(
                regexp = "^(default|mint|sun|moon|star|leaf|cat|dog|fox|bear|robot|rocket)$",
                message = "Invalid avatar"
        )
        String avatarKey
) {
}
