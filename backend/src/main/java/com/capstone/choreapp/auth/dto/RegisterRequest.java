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

        @NotBlank(message = "Invalid password. The The password must contain at least 8 characters, one uppercase letter, one number and one special character such as !, ?, or @.")
        @Pattern(
                regexp = "^(?=.{8,100}$)(?=.*\\p{Lu})(?=.*\\d)(?=.*[^\\p{L}\\p{N}\\s]).*$",
                message = "Invalid password. The The password must contain at least 8 characters, one uppercase letter, one number and one special character such as !, ?, or @."
        )
        String password
) {
}
