package com.capstone.choreapp.group.membership.service;

import com.capstone.choreapp.chore.repository.ChoreRepository;
import com.capstone.choreapp.activity.repository.ActivityEventRepository;
import com.capstone.choreapp.gamification.reward.repository.RewardRepository;
import com.capstone.choreapp.gamification.reward.repository.RewardRedemptionRepository;
import com.capstone.choreapp.group.membership.entity.GroupMembership;
import com.capstone.choreapp.group.membership.entity.GroupRole;
import com.capstone.choreapp.group.membership.exception.GroupAccessDeniedException;
import com.capstone.choreapp.group.membership.exception.GroupMembershipNotFoundException;
import com.capstone.choreapp.group.membership.repository.GroupMembershipRepository;
import com.capstone.choreapp.group.membership.repository.GroupJoinRequestRepository;
import com.capstone.choreapp.group.membership.entity.GroupJoinRequest;
import com.capstone.choreapp.group.membership.dto.GroupJoinRequestResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.capstone.choreapp.group.dto.*;
import com.capstone.choreapp.group.entity.Group;
import com.capstone.choreapp.group.exception.GroupNotFoundException;
import com.capstone.choreapp.group.membership.dto.AddGroupMemberRequest;
import com.capstone.choreapp.group.membership.dto.GroupMemberResponse;
import com.capstone.choreapp.group.membership.exception.UserAlreadyGroupMemberException;
import com.capstone.choreapp.group.membership.mapper.GroupMembershipMapper;
import com.capstone.choreapp.group.repository.GroupRepository;
import com.capstone.choreapp.user.entity.User;
import com.capstone.choreapp.user.exception.UserNotFoundException;
import com.capstone.choreapp.user.repository.UserRepository;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class GroupMembershipService {

    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final GroupMembershipMapper groupMembershipMapper;
    private final ChoreRepository choreRepository;
    private final ActivityEventRepository activityEventRepository;
    private final RewardRepository rewardRepository;
    private final RewardRedemptionRepository rewardRedemptionRepository;

    private final GroupMembershipRepository groupMembershipRepository;
    private final GroupJoinRequestRepository groupJoinRequestRepository;

    @Transactional(readOnly = true)
    public GroupMembership requireMember(Long groupId, Long userId) {
        return groupMembershipRepository
                .findByUserIdAndGroupId(userId, groupId)
                .orElseThrow(GroupMembershipNotFoundException::new);
    }

    @Transactional(readOnly = true)
    public GroupMembership requireOwner(Long groupId, Long userId) {
        GroupMembership membership = requireMember(groupId, userId);

        if (membership.getRole() != GroupRole.OWNER) {
            throw new GroupAccessDeniedException();
        }

        return membership;
    }

    @Transactional(readOnly = true)
    public GroupMembership requireManager(Long groupId, Long userId) {
        GroupMembership membership = requireMember(groupId, userId);

        if (membership.getRole() != GroupRole.OWNER
                && membership.getRole() != GroupRole.ADMIN) {
            throw new GroupAccessDeniedException();
        }

        return membership;
    }

    @Transactional(readOnly = true)
    public List<GroupMemberResponse> getGroupMembers(
            Long groupId,
            Long requesterId
    ) {
        requireMember(groupId, requesterId);

        return groupMembershipRepository.findAllByGroupId(groupId)
                .stream()
                .map(groupMembershipMapper::toResponse)
                .toList();
    }

    @Transactional
    public GroupMemberResponse addMember(
            Long groupId,
            Long requesterId,
            AddGroupMemberRequest request
    ) {
        requireManager(groupId, requesterId);

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new GroupNotFoundException(groupId));

        String normalizedEmail = request.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() ->
                        new UserNotFoundException("User was not found")
                );

        if (groupMembershipRepository
                .existsByUserIdAndGroupId(user.getId(), groupId)) {
            throw new UserAlreadyGroupMemberException();
        }

        GroupMembership membership =
                groupMembershipMapper.toEntity(
                        user,
                        group,
                        GroupRole.MEMBER
                );

        GroupMembership savedMembership =
                groupMembershipRepository.save(membership);

        return groupMembershipMapper.toResponse(savedMembership);
    }

    @Transactional
    public GroupJoinRequestResponse joinByInviteCode(
            String inviteCode,
            Long userId
    ) {
        String normalizedCode = inviteCode
                .trim()
                .toUpperCase(Locale.ROOT);

        Group group = groupRepository
                .findByInviteCode(normalizedCode)
                .orElseThrow(() ->
                        new IllegalArgumentException("Invalid invite code")
                );

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new UserNotFoundException(
                                "Authenticated user was not found"
                        )
                );

        if (groupMembershipRepository
                .existsByUserIdAndGroupId(userId, group.getId())) {
            throw new UserAlreadyGroupMemberException();
        }

        if (groupJoinRequestRepository.existsByUserIdAndGroupId(userId, group.getId())) {
            throw new IllegalArgumentException("Your request to join this household is already pending");
        }

        GroupJoinRequest joinRequest = new GroupJoinRequest();
        joinRequest.setUser(user);
        joinRequest.setGroup(group);

        return toJoinRequestResponse(groupJoinRequestRepository.save(joinRequest));
    }

    @Transactional(readOnly = true)
    public List<GroupJoinRequestResponse> getJoinRequests(Long groupId, Long requesterId) {
        requireManager(groupId, requesterId);
        return groupJoinRequestRepository.findAllByGroupIdOrderByRequestedAtAsc(groupId)
                .stream().map(this::toJoinRequestResponse).toList();
    }

    @Transactional
    public GroupMemberResponse approveJoinRequest(Long groupId, Long requesterId, Long requestId) {
        requireManager(groupId, requesterId);
        GroupJoinRequest request = requireJoinRequest(groupId, requestId);

        if (groupMembershipRepository.existsByUserIdAndGroupId(request.getUser().getId(), groupId)) {
            groupJoinRequestRepository.delete(request);
            throw new UserAlreadyGroupMemberException();
        }

        GroupMembership membership = groupMembershipMapper.toEntity(
                request.getUser(), request.getGroup(), GroupRole.MEMBER);

        // Flush both operations here instead of deferring them until transaction
        // commit. This guarantees that the response contains the persisted member
        // and prevents a pending request from remaining after approval.
        groupJoinRequestRepository.delete(request);
        groupJoinRequestRepository.flush();
        GroupMembership savedMembership = groupMembershipRepository.saveAndFlush(membership);

        return groupMembershipMapper.toResponse(savedMembership);
    }

    @Transactional
    public void rejectJoinRequest(Long groupId, Long requesterId, Long requestId) {
        requireManager(groupId, requesterId);
        groupJoinRequestRepository.delete(requireJoinRequest(groupId, requestId));
    }

    private GroupJoinRequest requireJoinRequest(Long groupId, Long requestId) {
        GroupJoinRequest request = groupJoinRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Join request was not found"));
        if (!request.getGroup().getId().equals(groupId)) {
            throw new IllegalArgumentException("Join request was not found");
        }
        return request;
    }

    private GroupJoinRequestResponse toJoinRequestResponse(GroupJoinRequest request) {
        return new GroupJoinRequestResponse(
                request.getId(), request.getGroup().getId(), request.getGroup().getName(),
                request.getUser().getId(), request.getUser().getName(), request.getUser().getEmail(),
                request.getRequestedAt());
    }


    @Transactional
    public void removeMember(
            Long groupId,
            Long requesterId,
            Long targetUserId
    ) {
        GroupMembership requester =
                requireManager(groupId, requesterId);

        GroupMembership target =
                groupMembershipRepository
                        .findByUserIdAndGroupId(targetUserId, groupId)
                        .orElseThrow(
                                GroupMembershipNotFoundException::new
                        );

        // Owner hiçbir zaman kicklenemez
        if (target.getRole() == GroupRole.OWNER) {
            throw new GroupAccessDeniedException();
        }

        // Kendini kicklemek yok
        if (requesterId.equals(targetUserId)) {
            throw new GroupAccessDeniedException();
        }

        // ADMIN başka ADMIN'i kickleyemez
        if (requester.getRole() == GroupRole.ADMIN
                && target.getRole() == GroupRole.ADMIN) {
            throw new GroupAccessDeniedException();
        }

        choreRepository.unassignUserFromGroupChores(
                groupId,
                targetUserId
        );

        groupMembershipRepository.delete(target);
    }

    @Transactional
    public void leaveGroup(Long groupId, Long userId) {
        GroupMembership membership = requireMember(groupId, userId);

        if (membership.getRole() == GroupRole.OWNER) {
            if (groupMembershipRepository.findAllByGroupId(groupId).size() == 1) {
                deleteHouseholdForSoleOwner(membership.getGroup());
                return;
            }

            GroupMembership successor = groupMembershipRepository
                    .findFirstByGroupIdAndRoleOrderByJoinedAtAsc(groupId, GroupRole.ADMIN)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Choose an admin before leaving this household"));

            successor.setRole(GroupRole.OWNER);
            successor.setDisplayTitle("Organizer");

            Group group = membership.getGroup();
            group.setOwner(successor.getUser());
            groupRepository.save(group);
        }

        choreRepository.unassignUserFromGroupChores(groupId, userId);
        groupMembershipRepository.delete(membership);
    }

    private void deleteHouseholdForSoleOwner(Group group) {
        Long groupId = group.getId();

        rewardRedemptionRepository.deleteAllByGroupId(groupId);
        rewardRepository.deleteAllByGroupId(groupId);
        activityEventRepository.deleteAllByGroupId(groupId);
        choreRepository.deleteCompletionDatesByGroupId(groupId);
        choreRepository.deleteRecurrenceDaysByGroupId(groupId);
        choreRepository.deleteAllByGroupId(groupId);
        groupJoinRequestRepository.deleteAllByGroupId(groupId);
        groupMembershipRepository.deleteAllByGroupId(groupId);
        groupRepository.delete(group);
    }

    @Transactional
    public GroupMemberResponse updateOwnDisplayTitle(
            Long groupId,
            Long userId,
            String displayTitle
    ) {
        GroupMembership membership = requireMember(groupId, userId);

        String normalizedTitle = displayTitle.trim();

        membership.setDisplayTitle(normalizedTitle);

        return groupMembershipMapper.toResponse(membership);
    }

    @Transactional
    public GroupMemberResponse updateMemberRole(
            Long groupId,
            Long requesterId,
            Long targetUserId,
            GroupRole newRole
    ) {
        requireOwner(groupId, requesterId);

        GroupMembership target =
                groupMembershipRepository
                        .findByUserIdAndGroupId(targetUserId, groupId)
                        .orElseThrow(
                                GroupMembershipNotFoundException::new
                        );

        // OWNER rolü hiçbir şekilde bu endpoint üzerinden değiştirilemez.
        if (target.getRole() == GroupRole.OWNER) {
            throw new GroupAccessDeniedException();
        }

        // Yeni OWNER oluşturmak da yasak.
        // OWNER transferi ileride ayrı bir feature olmalı.
        if (newRole == GroupRole.OWNER) {
            throw new IllegalArgumentException(
                    "Owner role cannot be assigned through this operation"
            );
        }

        // Sadece ADMIN <-> MEMBER değişimine izin veriyoruz.
        if (newRole != GroupRole.ADMIN
                && newRole != GroupRole.MEMBER) {
            throw new IllegalArgumentException(
                    "Role must be ADMIN or MEMBER"
            );
        }

        // Aynı role tekrar request gelirse idempotent davran.
        if (target.getRole() == newRole) {
            return groupMembershipMapper.toResponse(target);
        }

        if (newRole == GroupRole.ADMIN) {
            groupMembershipRepository.findAllByGroupId(groupId).stream()
                    .filter(membership -> membership.getRole() == GroupRole.ADMIN)
                    .filter(membership -> !membership.getId().equals(target.getId()))
                    .forEach(membership -> {
                        membership.setRole(GroupRole.MEMBER);
                        membership.setDisplayTitle("Member");
                    });
        }

        target.setRole(newRole);
        target.setDisplayTitle(newRole == GroupRole.ADMIN ? "Coordinator" : "Member");

        return groupMembershipMapper.toResponse(target);
    }
}
