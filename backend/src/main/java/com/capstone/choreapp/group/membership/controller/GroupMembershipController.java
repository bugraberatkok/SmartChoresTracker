package com.capstone.choreapp.group.membership.controller;

import com.capstone.choreapp.group.membership.dto.AddGroupMemberRequest;
import com.capstone.choreapp.group.membership.dto.GroupMemberResponse;
import com.capstone.choreapp.group.membership.dto.UpdateDisplayTitleRequest;
import com.capstone.choreapp.group.membership.dto.UpdateGroupRoleRequest;
import com.capstone.choreapp.group.membership.dto.GroupJoinRequestResponse;
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

    @GetMapping("/join-requests")
    public List<GroupJoinRequestResponse> getJoinRequests(@PathVariable Long groupId, Authentication authentication) {
        return groupMembershipService.getJoinRequests(groupId, Long.valueOf(authentication.getName()));
    }

    @PostMapping("/join-requests/{requestId}/approve")
    public GroupMemberResponse approveJoinRequest(@PathVariable Long groupId, @PathVariable Long requestId,
                                                   Authentication authentication) {
        return groupMembershipService.approveJoinRequest(groupId, Long.valueOf(authentication.getName()), requestId);
    }

    @DeleteMapping("/join-requests/{requestId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void rejectJoinRequest(@PathVariable Long groupId, @PathVariable Long requestId,
                                  Authentication authentication) {
        groupMembershipService.rejectJoinRequest(groupId, Long.valueOf(authentication.getName()), requestId);
    }

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

    @DeleteMapping("/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leaveGroup(@PathVariable Long groupId, Authentication authentication) {
        groupMembershipService.leaveGroup(groupId, Long.valueOf(authentication.getName()));
    }

    @PatchMapping("/me/display-title")
    public GroupMemberResponse updateOwnDisplayTitle(
            @PathVariable Long groupId,
            @Valid @RequestBody UpdateDisplayTitleRequest request,
            Authentication authentication
    ) {
        Long userId = Long.valueOf(authentication.getName());

        return groupMembershipService.updateOwnDisplayTitle(
                groupId,
                userId,
                request.displayTitle()
        );
    }

    @PatchMapping("/{userId}/role")
    public GroupMemberResponse updateMemberRole(
            @PathVariable Long groupId,
            @PathVariable Long userId,
            @Valid @RequestBody UpdateGroupRoleRequest request,
            Authentication authentication
    ) {
        Long requesterId =
                Long.valueOf(authentication.getName());

        return groupMembershipService.updateMemberRole(
                groupId,
                requesterId,
                userId,
                request.role()
        );
    }
}
