package com.capstone.choreapp.activity.controller;

import com.capstone.choreapp.activity.dto.ActivityResponse;
import com.capstone.choreapp.activity.service.ActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups/{groupId}/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @GetMapping
    public List<ActivityResponse> getActivities(
            @PathVariable Long groupId,
            Authentication authentication
    ) {
        Long requesterId =
                Long.valueOf(authentication.getName());

        return activityService.getActivities(
                groupId,
                requesterId
        );
    }
}