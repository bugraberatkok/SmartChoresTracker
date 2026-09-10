package com.capstone.choreapp.gamification.controller;

import com.capstone.choreapp.gamification.dto.AchievementResponse;
import com.capstone.choreapp.gamification.dto.LeaderboardEntryResponse;
import com.capstone.choreapp.gamification.dto.ProgressDayResponse;
import com.capstone.choreapp.gamification.dto.StreakResponse;
import com.capstone.choreapp.gamification.service.GamificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups/{groupId}/gamification")
@RequiredArgsConstructor
public class GamificationController {

    private final GamificationService gamificationService;

    @GetMapping("/leaderboard")
    public List<LeaderboardEntryResponse> getLeaderboard(
            @PathVariable Long groupId,
            Authentication authentication
    ) {
        Long userId = Long.valueOf(authentication.getName());

        return gamificationService.getLeaderboard(
                groupId,
                userId
        );
    }

    @GetMapping("/members/{memberUserId}/achievements")
    public List<AchievementResponse> getAchievements(
            @PathVariable Long groupId,
            @PathVariable Long memberUserId,
            Authentication authentication
    ) {
        Long requesterId = Long.valueOf(authentication.getName());

        return gamificationService.getAchievements(
                groupId,
                requesterId,
                memberUserId
        );
    }

    @GetMapping("/members/{memberUserId}/progress")
    public List<ProgressDayResponse> getWeeklyProgress(
            @PathVariable Long groupId,
            @PathVariable Long memberUserId,
            Authentication authentication
    ) {
        Long requesterId = Long.valueOf(authentication.getName());

        return gamificationService.getWeeklyProgress(
                groupId,
                requesterId,
                memberUserId
        );
    }

    @GetMapping("/members/{memberUserId}/streak")
    public StreakResponse getStreak(
            @PathVariable Long groupId,
            @PathVariable Long memberUserId,
            Authentication authentication
    ) {
        Long requesterId = Long.valueOf(authentication.getName());

        return gamificationService.getStreak(
                groupId,
                requesterId,
                memberUserId
        );
    }
}