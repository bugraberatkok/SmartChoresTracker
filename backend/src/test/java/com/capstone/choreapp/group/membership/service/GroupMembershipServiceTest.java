package com.capstone.choreapp.group.membership.service;

import com.capstone.choreapp.chore.repository.ChoreRepository;
import com.capstone.choreapp.activity.repository.ActivityEventRepository;
import com.capstone.choreapp.gamification.reward.repository.RewardRepository;
import com.capstone.choreapp.gamification.reward.repository.RewardRedemptionRepository;
import com.capstone.choreapp.group.entity.Group;
import com.capstone.choreapp.group.membership.dto.GroupJoinRequestResponse;
import com.capstone.choreapp.group.membership.entity.GroupJoinRequest;
import com.capstone.choreapp.group.membership.entity.GroupMembership;
import com.capstone.choreapp.group.membership.entity.GroupRole;
import com.capstone.choreapp.group.membership.mapper.GroupMembershipMapper;
import com.capstone.choreapp.group.membership.repository.GroupJoinRequestRepository;
import com.capstone.choreapp.group.membership.repository.GroupMembershipRepository;
import com.capstone.choreapp.group.repository.GroupRepository;
import com.capstone.choreapp.user.entity.User;
import com.capstone.choreapp.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GroupMembershipServiceTest {

    @Mock
    private GroupMembershipRepository groupMembershipRepository;

    @Mock
    private GroupJoinRequestRepository groupJoinRequestRepository;

    @Mock
    private ChoreRepository choreRepository;

    @Mock
    private ActivityEventRepository activityEventRepository;

    @Mock
    private RewardRepository rewardRepository;

    @Mock
    private RewardRedemptionRepository rewardRedemptionRepository;

    @Mock
    private GroupRepository groupRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private GroupMembershipMapper groupMembershipMapper;

    @InjectMocks
    private GroupMembershipService groupMembershipService;

    @Test
    void shouldCreatePendingRequestUsingInviteCode() {

        Long groupId = 10L;
        Long userId = 20L;

        Group group = mock(Group.class);
        User user = mock(User.class);
        when(group.getId()).thenReturn(groupId);
        when(group.getName()).thenReturn("Home");
        when(user.getId()).thenReturn(userId);
        when(user.getName()).thenReturn("Alex");
        when(user.getEmail()).thenReturn("alex@example.com");

        when(groupRepository.findByInviteCode("A7F3C9"))
                .thenReturn(Optional.of(group));

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        when(groupMembershipRepository
                .existsByUserIdAndGroupId(userId, groupId))
                .thenReturn(false);

        when(groupJoinRequestRepository.existsByUserIdAndGroupId(userId, groupId))
                .thenReturn(false);
        when(groupJoinRequestRepository.save(any(GroupJoinRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        GroupJoinRequestResponse result =
                groupMembershipService.joinByInviteCode(
                        "  a7f3c9  ",
                        userId
                );

        assertEquals(groupId, result.groupId());
        assertEquals("Home", result.groupName());
        assertEquals(userId, result.userId());

        verify(groupRepository)
                .findByInviteCode("A7F3C9");

        verify(groupMembershipRepository)
                .existsByUserIdAndGroupId(userId, groupId);

        verify(groupJoinRequestRepository).save(any(GroupJoinRequest.class));
    }

    @Test
    void shouldAllowMemberToLeaveGroup() {
        Long groupId = 10L;
        Long userId = 20L;
        GroupMembership membership = mock(GroupMembership.class);
        when(membership.getRole()).thenReturn(GroupRole.MEMBER);
        when(groupMembershipRepository.findByUserIdAndGroupId(userId, groupId))
                .thenReturn(Optional.of(membership));

        groupMembershipService.leaveGroup(groupId, userId);

        verify(groupMembershipRepository).delete(membership);
    }

    @Test
    void shouldDeleteHouseholdWhenSoleOwnerLeaves() {
        Long groupId = 10L;
        Long userId = 20L;
        Group group = mock(Group.class);
        GroupMembership membership = mock(GroupMembership.class);
        when(group.getId()).thenReturn(groupId);
        when(membership.getRole()).thenReturn(GroupRole.OWNER);
        when(membership.getGroup()).thenReturn(group);
        when(groupMembershipRepository.findByUserIdAndGroupId(userId, groupId))
                .thenReturn(Optional.of(membership));
        when(groupMembershipRepository.findAllByGroupId(groupId))
                .thenReturn(List.of(membership));

        groupMembershipService.leaveGroup(groupId, userId);

        verify(groupMembershipRepository).deleteAllByGroupId(groupId);
        verify(groupRepository).delete(group);
        verify(groupMembershipRepository, never()).delete(membership);
    }
}
