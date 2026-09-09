package com.capstone.choreapp.user.controller;

import com.capstone.choreapp.user.dto.UpdateProfileRequest;
import com.capstone.choreapp.user.dto.UserResponse;
import com.capstone.choreapp.user.entity.User;
import com.capstone.choreapp.user.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public UserResponse getCurrentUser(
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long userId = Long.valueOf(jwt.getSubject());

        User user = getUser(userId);

        return toResponse(user);
    }

    @PatchMapping("/me")
    public UserResponse updateCurrentUser(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        Long userId = Long.valueOf(jwt.getSubject());

        User user = getUser(userId);

        if (request.name() != null) {
            String normalizedName = request.name().trim();

            if (normalizedName.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Name cannot be blank"
                );
            }

            user.setName(normalizedName);
        }

        if (request.avatarKey() != null) {
            user.setAvatarKey(request.avatarKey());
        }

        User savedUser = userRepository.save(user);

        return toResponse(savedUser);
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getAvatarKey()
        );
    }
}
