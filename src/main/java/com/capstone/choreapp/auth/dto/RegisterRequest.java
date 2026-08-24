package com.capstone.choreapp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

public record RegisterRequest(

        @NotBlank(message = "Name cannot be empty")
        @Size(min = 2, max = 50, message = "Name must be between 2 and 50 characters")
        String name,

        @NotBlank(message = "Email cannot be empty")
        @Email(message = "Email format is invalid")
        String email,

        @NotBlank(message = "Password cannot be empty")
        @Size(min = 8, max = 100, message = "Password must be at least 8 characters")
        @Pattern(
                regexp = ".*\\p{Lu}.*",
                message = "Password must contain at least one uppercase letter"
        )
        @Pattern(
                regexp = ".*\\d.*",
                message = "Password must contain at least one number"
        )
        @Pattern(
                regexp = ".*[^\\p{L}\\p{N}\\s].*",
                message = "Password must contain at least one special character"
        )
        String password
) {
}