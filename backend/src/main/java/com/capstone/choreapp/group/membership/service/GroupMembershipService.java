package com.capstone.choreapp.group.membership.service;

import com.capstone.choreapp.chore.repository.ChoreRepository;
import com.capstone.choreapp.group.membership.entity.GroupMembership;
import com.capstone.choreapp.group.membership.entity.GroupRole;
import com.capstone.choreapp.group.membership.exception.GroupAccessDeniedException;
import com.capstone.choreapp.group.membership.exception.GroupMembershipNotFoundException;
import com.capstone.choreapp.group.membership.repository.GroupMembershipRepository;
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

    private final GroupMembershipRepository groupMembershipRepository;

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
    public GroupMemberResponse joinGroup(
            Long groupId,
            Long userId
    ) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new GroupNotFoundException(groupId));

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new UserNotFoundException("Authenticated user was not found")
                );

        if (groupMembershipRepository
                .existsByUserIdAndGroupId(userId, groupId)) {
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
}