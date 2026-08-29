package com.capstone.choreapp.group.membership.controller;

import com.capstone.choreapp.group.membership.dto.AddGroupMemberRequest;
import com.capstone.choreapp.group.membership.dto.GroupMemberResponse;
import com.capstone.choreapp.group.membership.service.GroupMembershipService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups/{groupId}/members")
@RequiredArgsConstructor
public class GroupMembershipController {

    private final GroupMembershipService groupMembershipService;

    @GetMapping
    public List<GroupMemberResponse> getGroupMembers(
            @PathVariable Long groupId,
            Authentication authentication
    ) {
        Long userId = Long.valueOf(authentication.getName());

        return groupMembershipService.getGroupMembers(
                groupId,
                userId
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GroupMemberResponse addMember(
            @PathVariable Long groupId,
            @Valid @RequestBody AddGroupMemberRequest request,
            Authentication authentication
    ) {
        Long userId = Long.valueOf(authentication.getName());

        return groupMembershipService.addMember(
                groupId,
                userId,
                request
        );
    }

    @DeleteMapping("/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(
            @PathVariable Long groupId,
            @PathVariable Long userId,
            Authentication authentication
    ) {
        Long requesterId =
                Long.valueOf(authentication.getName());

        groupMembershipService.removeMember(
                groupId,
                requesterId,
                userId
        );
    }
}