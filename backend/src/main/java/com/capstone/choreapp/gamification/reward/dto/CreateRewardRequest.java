package com.capstone.choreapp.gamification.reward.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateRewardRequest(

        @NotBlank
        @Size(max = 100)
        String name,

        @Size(max = 300)
        String description,

        @Min(1)
        @Max(100000)
        Integer cost
) {
}