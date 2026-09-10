package com.capstone.choreapp.gamification.reward.controller;

import com.capstone.choreapp.gamification.reward.dto.CreateRewardRequest;
import com.capstone.choreapp.gamification.reward.dto.RewardBalanceResponse;
import com.capstone.choreapp.gamification.reward.dto.RewardRedemptionResponse;
import com.capstone.choreapp.gamification.reward.dto.RewardResponse;
import com.capstone.choreapp.gamification.reward.service.RewardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups/{groupId}/rewards")
@RequiredArgsConstructor
public class RewardController {

    private final RewardService rewardService;

    @GetMapping
    public List<RewardResponse> getRewards(
            @PathVariable Long groupId,
            Authentication authentication
    ) {
        Long userId = Long.valueOf(
                authentication.getName()
        );

        return rewardService.getRewards(
                groupId,
                userId
        );
    }

    @GetMapping("/balance")
    public RewardBalanceResponse getBalance(
            @PathVariable Long groupId,
            Authentication authentication
    ) {
        Long userId = Long.valueOf(
                authentication.getName()
        );

        return rewardService.getBalance(
                groupId,
                userId
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RewardResponse createReward(
            @PathVariable Long groupId,
            @Valid @RequestBody CreateRewardRequest request,
            Authentication authentication
    ) {
        Long userId = Long.valueOf(
                authentication.getName()
        );

        return rewardService.createReward(
                groupId,
                userId,
                request
        );
    }

    @PostMapping("/{rewardId}/redeem")
    @ResponseStatus(HttpStatus.CREATED)
    public RewardRedemptionResponse redeemReward(
            @PathVariable Long groupId,
            @PathVariable Long rewardId,
            Authentication authentication
    ) {
        Long userId = Long.valueOf(
                authentication.getName()
        );

        return rewardService.redeemReward(
                groupId,
                userId,
                rewardId
        );
    }

    @DeleteMapping("/{rewardId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivateReward(
            @PathVariable Long groupId,
            @PathVariable Long rewardId,
            Authentication authentication
    ) {
        Long userId = Long.valueOf(
                authentication.getName()
        );

        rewardService.deactivateReward(
                groupId,
                userId,
                rewardId
        );
    }
}