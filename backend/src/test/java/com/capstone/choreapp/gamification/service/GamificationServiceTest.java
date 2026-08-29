package com.capstone.choreapp.gamification.service;

import com.capstone.choreapp.chore.entity.Chore;
import com.capstone.choreapp.chore.entity.ChoreStatus;
import com.capstone.choreapp.chore.repository.ChoreRepository;
import com.capstone.choreapp.gamification.dto.LeaderboardEntryResponse;
import com.capstone.choreapp.group.membership.entity.GroupMembership;
import com.capstone.choreapp.group.membership.repository.GroupMembershipRepository;
import com.capstone.choreapp.group.membership.service.GroupMembershipService;
import com.capstone.choreapp.user.entity.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GamificationServiceTest {

    @Mock
    private GroupMembershipRepository groupMembershipRepository;

    @Mock
    private ChoreRepository choreRepository;

    @Mock
    private GroupMembershipService groupMembershipService;

    @InjectMocks
    private GamificationService gamificationService;

    @Test
    void shouldCalculateLeaderboardPointsAndRanks() {

        Long groupId = 10L;
        Long requesterId = 99L;

        User alice = mock(User.class);
        when(alice.getId()).thenReturn(1L);
        when(alice.getName()).thenReturn("Alice");

        User bob = mock(User.class);
        when(bob.getId()).thenReturn(2L);
        when(bob.getName()).thenReturn("Bob");

        GroupMembership aliceMembership =
                mock(GroupMembership.class);
        when(aliceMembership.getUser())
                .thenReturn(alice);

        GroupMembership bobMembership =
                mock(GroupMembership.class);
        when(bobMembership.getUser())
                .thenReturn(bob);

        Chore recurringChore = mock(Chore.class);
        when(recurringChore.getAssignedUser())
                .thenReturn(alice);
        when(recurringChore.isRecurring())
                .thenReturn(true);
        when(recurringChore.getPoints())
                .thenReturn(40);
        when(recurringChore.getCompletedDates())
                .thenReturn(Set.of(
                        LocalDate.of(2026, 8, 28),
                        LocalDate.of(2026, 8, 29)
                ));

        Chore normalAliceChore = mock(Chore.class);
        when(normalAliceChore.getAssignedUser())
                .thenReturn(alice);
        when(normalAliceChore.isRecurring())
                .thenReturn(false);
        when(normalAliceChore.getPoints())
                .thenReturn(20);
        when(normalAliceChore.getStatus())
                .thenReturn(ChoreStatus.COMPLETED);

        Chore bobChore = mock(Chore.class);
        when(bobChore.getAssignedUser())
                .thenReturn(bob);
        when(bobChore.isRecurring())
                .thenReturn(false);
        when(bobChore.getPoints())
                .thenReturn(50);
        when(bobChore.getStatus())
                .thenReturn(ChoreStatus.COMPLETED);

        when(groupMembershipRepository
                .findAllByGroupId(groupId))
                .thenReturn(List.of(
                        aliceMembership,
                        bobMembership
                ));

        when(choreRepository.findAllByGroupId(groupId))
                .thenReturn(List.of(
                        recurringChore,
                        normalAliceChore,
                        bobChore
                ));

        List<LeaderboardEntryResponse> result =
                gamificationService.getLeaderboard(
                        groupId,
                        requesterId
                );

        assertEquals(2, result.size());

        assertEquals("Alice", result.get(0).name());
        assertEquals(100, result.get(0).totalPoints());
        assertEquals(3, result.get(0).completedChores());
        assertEquals(1, result.get(0).rank());

        assertEquals("Bob", result.get(1).name());
        assertEquals(50, result.get(1).totalPoints());
        assertEquals(1, result.get(1).completedChores());
        assertEquals(2, result.get(1).rank());

        verify(groupMembershipService)
                .requireMember(groupId, requesterId);
    }
}