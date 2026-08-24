package com.capstone.choreapp.group.controller;

import com.capstone.choreapp.group.dto.CreateGroupRequest;
import com.capstone.choreapp.group.dto.GroupResponse;
import com.capstone.choreapp.group.service.GroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import com.capstone.choreapp.group.dto.UpdateGroupRequest;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GroupResponse createGroup(
            @Valid @RequestBody CreateGroupRequest request,
            Authentication authentication
    ) {
        Long ownerId = Long.valueOf(authentication.getName());

        return groupService.createGroup(request, ownerId);
    }

    @GetMapping
    public List<GroupResponse> getOwnedGroups(
            Authentication authentication
    ) {
        Long ownerId = Long.valueOf(authentication.getName());

        return groupService.getOwnedGroups(ownerId);
    }

    @GetMapping("/{groupId}")
    public GroupResponse getGroupById(
            @PathVariable Long groupId,
            Authentication authentication
    ) {
        Long ownerId = Long.valueOf(authentication.getName());

        return groupService.getGroupById(groupId, ownerId);
    }

    @PatchMapping("/{groupId}")
    public GroupResponse updateGroup(
            @PathVariable Long groupId,
            @Valid @RequestBody UpdateGroupRequest request,
            Authentication authentication
    ) {
        Long ownerId = Long.valueOf(authentication.getName());

        return groupService.updateGroup(groupId, ownerId, request);
    }
    @DeleteMapping("/{groupId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGroup(
            @PathVariable Long groupId,
            Authentication authentication
    ) {
        Long ownerId = Long.valueOf(authentication.getName());

        groupService.deleteGroup(groupId, ownerId);
    }
}


