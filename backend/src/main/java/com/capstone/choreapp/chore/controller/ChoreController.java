package com.capstone.choreapp.chore.controller;

import com.capstone.choreapp.chore.dto.ChoreResponse;
import com.capstone.choreapp.chore.dto.CreateChoreRequest;
import com.capstone.choreapp.chore.service.ChoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/groups/{groupId}/chores")
@RequiredArgsConstructor
public class ChoreController {

    private final ChoreService choreService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ChoreResponse createChore(
            @PathVariable Long groupId,
            @Valid @RequestBody CreateChoreRequest request,
            Authentication authentication
    ) {
        Long creatorId = Long.valueOf(authentication.getName());

        return choreService.createChore(
                groupId,
                creatorId,
                request
        );
    }

    @GetMapping
    public List<ChoreResponse> getGroupChores(
            @PathVariable Long groupId,
            Authentication authentication
    ) {
        Long userId = Long.valueOf(authentication.getName());

        return choreService.getGroupChores(
                groupId,
                userId
        );
    }

    @GetMapping("/{choreId}")
    public ChoreResponse getChoreById(
            @PathVariable Long groupId,
            @PathVariable Long choreId,
            Authentication authentication
    ) {
        Long userId = Long.valueOf(authentication.getName());

        return choreService.getChoreById(
                groupId,
                choreId,
                userId
        );
    }
}