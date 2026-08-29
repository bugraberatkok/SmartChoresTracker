package com.capstone.choreapp.chore.service;

import com.capstone.choreapp.chore.entity.Chore;
import com.capstone.choreapp.chore.mapper.ChoreMapper;
import com.capstone.choreapp.chore.repository.ChoreRepository;
import com.capstone.choreapp.group.entity.Group;
import com.capstone.choreapp.group.membership.service.GroupMembershipService;
import com.capstone.choreapp.group.repository.GroupRepository;
import com.capstone.choreapp.user.entity.User;
import com.capstone.choreapp.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChoreServiceTest {

    @Mock
    private ChoreRepository choreRepository;

    @Mock
    private GroupRepository groupRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private GroupMembershipService groupMembershipService;

    @Mock
    private ChoreMapper choreMapper;

    @InjectMocks
    private ChoreService choreService;

    @Test
    void shouldRejectRecurringChoreCompletionOnUnscheduledDay() {

        Long groupId = 10L;
        Long choreId = 20L;
        Long userId = 30L;

        Group group = new Group();
        group.setId(groupId);

        User assignedUser = mock(User.class);
        when(assignedUser.getId()).thenReturn(userId);

        Chore chore = new Chore();
        chore.setId(choreId);
        chore.setGroup(group);
        chore.setAssignedUser(assignedUser);
        chore.setRecurring(true);

        chore.setRecurrenceDays(
                Set.of(
                        DayOfWeek.SATURDAY,
                        DayOfWeek.SUNDAY
                )
        );

        chore.setRecurrenceStartDate(
                LocalDate.of(2026, 8, 29)
        );

        when(choreRepository.findById(choreId))
                .thenReturn(Optional.of(chore));

        LocalDate invalidDate =
                LocalDate.of(2026, 8, 31); // Monday

        assertThrows(
                IllegalArgumentException.class,
                () -> choreService.completeChore(
                        groupId,
                        choreId,
                        userId,
                        invalidDate
                )
        );
    }
}