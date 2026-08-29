package com.capstone.choreapp.group.service;

import java.util.List;
import java.util.UUID;

import com.capstone.choreapp.chore.repository.ChoreRepository;
import com.capstone.choreapp.group.membership.service.GroupMembershipService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.capstone.choreapp.group.dto.CreateGroupRequest;
import com.capstone.choreapp.group.dto.GroupResponse;
import com.capstone.choreapp.group.dto.UpdateGroupRequest;
import com.capstone.choreapp.group.entity.Group;
import com.capstone.choreapp.group.exception.GroupNotFoundException;
import com.capstone.choreapp.group.mapper.GroupMapper;
import com.capstone.choreapp.group.membership.entity.GroupMembership;
import com.capstone.choreapp.group.membership.entity.GroupRole;
import com.capstone.choreapp.group.membership.mapper.GroupMembershipMapper;
import com.capstone.choreapp.group.membership.repository.GroupMembershipRepository;
import com.capstone.choreapp.group.repository.GroupRepository;
import com.capstone.choreapp.user.entity.User;
import com.capstone.choreapp.user.exception.UserNotFoundException;
import com.capstone.choreapp.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final GroupMapper groupMapper;
    private final GroupMembershipRepository groupMembershipRepository;
    private final GroupMembershipMapper groupMembershipMapper;
    private final GroupMembershipService groupMembershipService;
    private final ChoreRepository choreRepository;

    @Transactional
    public GroupResponse createGroup(
            CreateGroupRequest request,
            Long ownerId
    ) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(()
                        -> new UserNotFoundException(
                        "Authenticated user was not found"
                )
                );

        Group group = groupMapper.toEntity(request, owner);

        String inviteCode = UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 6)
                .toUpperCase();

        group.setInviteCode(inviteCode);

        Group savedGroup = groupRepository.save(group);

        GroupMembership ownerMembership
                = groupMembershipMapper.toEntity(
                        owner,
                        savedGroup,
                        GroupRole.OWNER
                );

        groupMembershipRepository.save(ownerMembership);

        return groupMapper.toResponse(savedGroup);
    }

    @Transactional(readOnly = true)
    public List<GroupResponse> getUserGroups(Long userId) {
        return groupMembershipRepository.findAllByUserId(userId)
                .stream()
                .map(GroupMembership::getGroup)
                .map(groupMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GroupResponse getGroupById(Long groupId, Long userId) {

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new GroupNotFoundException(groupId));

        groupMembershipService.requireMember(groupId, userId);

        return groupMapper.toResponse(group);
    }

    @Transactional
    public GroupResponse updateGroup(
            Long groupId,
            Long ownerId,
            UpdateGroupRequest request
    ) {
        Group group = groupRepository.findByIdAndOwnerId(groupId, ownerId)
                .orElseThrow(() -> new GroupNotFoundException(groupId));

        groupMapper.updateEntity(group, request);

        return groupMapper.toResponse(group);
    }

    @Transactional
    public void deleteGroup(Long groupId, Long ownerId) {
        Group group = groupRepository
                .findByIdAndOwnerId(groupId, ownerId)
                .orElseThrow(() ->
                        new GroupNotFoundException(groupId)
                );

        choreRepository.deleteAllByGroupId(groupId);

        groupMembershipRepository.deleteAllByGroupId(groupId);

        groupRepository.delete(group);
    }

    @Transactional
    public String getOrCreateInviteCode(
            Long groupId,
            Long requesterId
    ) {
        groupMembershipService.requireMember(
                groupId,
                requesterId
        );

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() ->
                        new GroupNotFoundException(groupId)
                );

        if (group.getInviteCode() == null
                || group.getInviteCode().isBlank()) {

            String inviteCode = UUID.randomUUID()
                    .toString()
                    .replace("-", "")
                    .substring(0, 6)
                    .toUpperCase();

            group.setInviteCode(inviteCode);
        }

        return group.getInviteCode();
    }


}
