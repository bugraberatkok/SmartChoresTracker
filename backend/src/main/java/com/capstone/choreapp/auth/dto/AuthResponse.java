package com.capstone.choreapp.auth.dto;

import com.capstone.choreapp.user.dto.UserResponse;

public record AuthResponse(
        String accessToken,
        String tokenType,
        UserResponse user
) {
}