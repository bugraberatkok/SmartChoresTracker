package com.capstone.choreapp.group.membership.service;

import com.capstone.choreapp.group.entity.Group;
import com.capstone.choreapp.group.membership.dto.GroupMemberResponse;
import com.capstone.choreapp.group.membership.entity.GroupMembership;
import com.capstone.choreapp.group.membership.entity.GroupRole;
import com.capstone.choreapp.group.membership.mapper.GroupMembershipMapper;
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

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GroupMembershipServiceTest {

    @Mock
    private GroupMembershipRepository groupMembershipRepository;

    @Mock
    private GroupRepository groupRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private GroupMembershipMapper groupMembershipMapper;

    @InjectMocks
    private GroupMembershipService groupMembershipService;

    @Test
    void shouldJoinGroupUsingInviteCode() {

        Long groupId = 10L;
        Long userId = 20L;

        Group group = mock(Group.class);
        User user = mock(User.class);
        GroupMembership membership = mock(GroupMembership.class);
        GroupMemberResponse expectedResponse =
                mock(GroupMemberResponse.class);

        when(group.getId()).thenReturn(groupId);

        when(groupRepository.findByInviteCode("A7F3C9"))
                .thenReturn(Optional.of(group));

        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user));

        when(groupMembershipRepository
                .existsByUserIdAndGroupId(userId, groupId))
                .thenReturn(false);

        when(groupMembershipMapper.toEntity(
                user,
                group,
                GroupRole.MEMBER
        )).thenReturn(membership);

        when(groupMembershipRepository.save(membership))
                .thenReturn(membership);

        when(groupMembershipMapper.toResponse(membership))
                .thenReturn(expectedResponse);

        GroupMemberResponse result =
                groupMembershipService.joinByInviteCode(
                        "  a7f3c9  ",
                        userId
                );

        assertSame(expectedResponse, result);

        verify(groupRepository)
                .findByInviteCode("A7F3C9");

        verify(groupMembershipRepository)
                .existsByUserIdAndGroupId(userId, groupId);

        verify(groupMembershipRepository)
                .save(membership);
    }
}