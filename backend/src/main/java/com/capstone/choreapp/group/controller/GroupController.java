package com.capstone.choreapp.group.controller;

import com.capstone.choreapp.group.dto.CreateGroupRequest;
import com.capstone.choreapp.group.dto.GroupResponse;
import com.capstone.choreapp.group.membership.dto.GroupMemberResponse;
import com.capstone.choreapp.group.membership.dto.JoinGroupByCodeRequest;
import com.capstone.choreapp.group.membership.service.GroupMembershipService;
import com.capstone.choreapp.group.service.GroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

import com.capstone.choreapp.group.dto.UpdateGroupRequest;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;
    private final GroupMembershipService groupMembershipService;

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
    public List<GroupResponse> getUserGroups(
            Authentication authentication
    ) {
        Long userId = Long.valueOf(authentication.getName());

        return groupService.getUserGroups(userId);
    }

    @GetMapping("/{groupId}")
    public GroupResponse getGroupById(
            @PathVariable Long groupId,
            Authentication authentication
    ) {
        Long userId = Long.valueOf(authentication.getName());

        return groupService.getGroupById(groupId, userId);
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

    @PostMapping("/join-by-code")
    @ResponseStatus(HttpStatus.CREATED)
    public GroupMemberResponse joinByInviteCode(
            @Valid @RequestBody JoinGroupByCodeRequest request,
            Authentication authentication
    ) {
        Long userId = Long.valueOf(authentication.getName());

        return groupMembershipService.joinByInviteCode(
                request.inviteCode(),
                userId
        );
    }

    @PostMapping("/{groupId}/invite-code")
    public Map<String, String> getOrCreateInviteCode(
            @PathVariable Long groupId,
            Authentication authentication
    ) {
        Long requesterId =
                Long.valueOf(authentication.getName());

        String inviteCode =
                groupService.getOrCreateInviteCode(
                        groupId,
                        requesterId
                );

        return Map.of("inviteCode", inviteCode);
    }


}


