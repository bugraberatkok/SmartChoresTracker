package com.capstone.choreapp.user.dto;

public record UserResponse(
        Long id,
        String name,
        String email,
        String avatarKey
) {

    public UserResponse(
            Long id,
            String name,
            String email
    ) {
        this(id, name, email, null);
    }
}
