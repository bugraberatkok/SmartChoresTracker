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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.BeforeEach;
import com.capstone.choreapp.gamification.dto.StreakResponse;

import java.time.ZoneId;
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

    private GamificationService gamificationService;

    private final ZoneId testZoneId = ZoneId.of("UTC");

    @BeforeEach
    void setUp() {
        gamificationService = new GamificationService(
                groupMembershipRepository,
                choreRepository,
                groupMembershipService,
                testZoneId
        );
    }

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

    @Test
    void shouldCalculateCurrentAndLongestStreak() {

        Long groupId = 10L;
        Long requesterId = 99L;
        Long memberUserId = 1L;

        LocalDate today = LocalDate.now(testZoneId);

        User user = mock(User.class);
        when(user.getId()).thenReturn(memberUserId);

        Chore recurringChore = mock(Chore.class);

        when(recurringChore.getAssignedUser())
                .thenReturn(user);

        when(recurringChore.isRecurring())
                .thenReturn(true);

        when(recurringChore.getCompletedDates())
                .thenReturn(Set.of(
                        today.minusDays(5),
                        today.minusDays(4),
                        today.minusDays(2),
                        today.minusDays(1),
                        today
                ));

        when(choreRepository.findAllByGroupId(groupId))
                .thenReturn(List.of(recurringChore));

        StreakResponse result =
                gamificationService.getStreak(
                        groupId,
                        requesterId,
                        memberUserId
                );

        assertEquals(3, result.currentStreak());
        assertEquals(3, result.longestStreak());
        assertEquals(today, result.lastActiveDate());

        verify(groupMembershipService)
                .requireMember(groupId, requesterId);

        verify(groupMembershipService)
                .requireMember(groupId, memberUserId);
    }

    @Test
    void shouldIncludeCompletedNonRecurringChoreInStreak() {

        Long groupId = 10L;
        Long requesterId = 99L;
        Long memberUserId = 1L;

        LocalDate today = LocalDate.now(testZoneId);

        User user = mock(User.class);
        when(user.getId()).thenReturn(memberUserId);

        Chore normalChore = mock(Chore.class);

        when(normalChore.getAssignedUser())
                .thenReturn(user);

        when(normalChore.isRecurring())
                .thenReturn(false);

        when(normalChore.getStatus())
                .thenReturn(ChoreStatus.COMPLETED);

        when(normalChore.getCompletedAt())
                .thenReturn(
                        today.atTime(12, 0)
                                .atZone(testZoneId)
                                .toInstant()
                );

        when(choreRepository.findAllByGroupId(groupId))
                .thenReturn(List.of(normalChore));

        StreakResponse result =
                gamificationService.getStreak(
                        groupId,
                        requesterId,
                        memberUserId
                );

        assertEquals(1, result.currentStreak());
        assertEquals(1, result.longestStreak());
        assertEquals(today, result.lastActiveDate());
    }

    @Test
    void shouldReturnEmptyStreakWhenUserHasNoCompletedChores() {

        Long groupId = 10L;
        Long requesterId = 99L;
        Long memberUserId = 1L;

        User user = mock(User.class);
        when(user.getId()).thenReturn(memberUserId);

        Chore incompleteChore = mock(Chore.class);

        when(incompleteChore.getAssignedUser())
                .thenReturn(user);

        when(incompleteChore.isRecurring())
                .thenReturn(false);

        when(incompleteChore.getStatus())
                .thenReturn(ChoreStatus.PENDING);

        when(choreRepository.findAllByGroupId(groupId))
                .thenReturn(List.of(incompleteChore));

        StreakResponse result =
                gamificationService.getStreak(
                        groupId,
                        requesterId,
                        memberUserId
                );

        assertEquals(0, result.currentStreak());
        assertEquals(0, result.longestStreak());
        assertEquals(null, result.lastActiveDate());
    }

    @Test
    void shouldReturnZeroCurrentStreakWhenStreakIsBroken() {

        Long groupId = 10L;
        Long requesterId = 99L;
        Long memberUserId = 1L;

        LocalDate today = LocalDate.now(testZoneId);

        User user = mock(User.class);
        when(user.getId()).thenReturn(memberUserId);

        Chore recurringChore = mock(Chore.class);

        when(recurringChore.getAssignedUser())
                .thenReturn(user);

        when(recurringChore.isRecurring())
                .thenReturn(true);

        when(recurringChore.getCompletedDates())
                .thenReturn(Set.of(
                        today.minusDays(4),
                        today.minusDays(3),
                        today.minusDays(2)
                ));

        when(choreRepository.findAllByGroupId(groupId))
                .thenReturn(List.of(recurringChore));

        StreakResponse result =
                gamificationService.getStreak(
                        groupId,
                        requesterId,
                        memberUserId
                );

        assertEquals(0, result.currentStreak());
        assertEquals(3, result.longestStreak());
        assertEquals(today.minusDays(2), result.lastActiveDate());
    }
}