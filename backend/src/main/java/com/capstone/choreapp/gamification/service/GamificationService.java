package com.capstone.choreapp.gamification.service;

import com.capstone.choreapp.chore.entity.Chore;
import com.capstone.choreapp.chore.entity.ChoreStatus;
import com.capstone.choreapp.chore.repository.ChoreRepository;
import com.capstone.choreapp.gamification.dto.AchievementResponse;
import com.capstone.choreapp.gamification.dto.LeaderboardEntryResponse;
import com.capstone.choreapp.gamification.dto.ProgressDayResponse;
import com.capstone.choreapp.group.membership.repository.GroupMembershipRepository;
import com.capstone.choreapp.group.membership.service.GroupMembershipService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GamificationService {

    private final GroupMembershipRepository groupMembershipRepository;
    private final ChoreRepository choreRepository;
    private final GroupMembershipService groupMembershipService;
    private final ZoneId applicationZoneId;

    @Transactional(readOnly = true)
    public List<LeaderboardEntryResponse> getLeaderboard(
            Long groupId,
            Long userId
    ) {
        groupMembershipService.requireMember(groupId, userId);

        List<Chore> chores = choreRepository.findAllByGroupId(groupId);

        List<LeaderboardEntryResponse> entries =
                groupMembershipRepository.findAllByGroupId(groupId)
                        .stream()
                        .map(membership -> {

                            Long memberUserId = membership.getUser().getId();

                            List<Chore> userChores = chores.stream()
                                    .filter(chore ->
                                            chore.getAssignedUser() != null
                                                    && chore.getAssignedUser()
                                                    .getId()
                                                    .equals(memberUserId)
                                    )
                                    .toList();

                            int completedChores = userChores.stream()
                                    .mapToInt(this::completionCount)
                                    .sum();

                            int totalPoints = userChores.stream()
                                    .mapToInt(chore ->
                                            (chore.getPoints() == null
                                                    ? 0
                                                    : chore.getPoints())
                                                    * completionCount(chore)
                                    )
                                    .sum();

                            return new LeaderboardEntryResponse(
                                    memberUserId,
                                    membership.getUser().getName(),
                                    totalPoints,
                                    completedChores,
                                    0
                            );
                        })
                        .sorted(
                                Comparator.comparingInt(
                                                LeaderboardEntryResponse::totalPoints
                                        )
                                        .reversed()
                                        .thenComparing(
                                                LeaderboardEntryResponse::name
                                        )
                        )
                        .toList();

        return entries.stream()
                .map(entry -> {

                    int rank = 1 + (int) entries.stream()
                            .filter(other ->
                                    other.totalPoints() > entry.totalPoints()
                            )
                            .count();

                    return new LeaderboardEntryResponse(
                            entry.userId(),
                            entry.name(),
                            entry.totalPoints(),
                            entry.completedChores(),
                            rank
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AchievementResponse> getAchievements(
            Long groupId,
            Long requesterId,
            Long memberUserId
    ) {
        groupMembershipService.requireMember(groupId, requesterId);
        groupMembershipService.requireMember(groupId, memberUserId);

        List<Chore> userChores = choreRepository.findAllByGroupId(groupId)
                .stream()
                .filter(chore ->
                        chore.getAssignedUser() != null
                                && chore.getAssignedUser()
                                .getId()
                                .equals(memberUserId)
                )
                .toList();

        int completedChores = userChores.stream()
                .mapToInt(this::completionCount)
                .sum();

        int totalPoints = userChores.stream()
                .mapToInt(chore ->
                        (chore.getPoints() == null ? 0 : chore.getPoints())
                                * completionCount(chore)
                )
                .sum();

        return List.of(
                new AchievementResponse(
                        "FIRST_CHORE",
                        "First Step",
                        "Complete your first chore",
                        "🌱",
                        1,
                        completedChores,
                        completedChores >= 1
                ),
                new AchievementResponse(
                        "FIFTY_POINTS",
                        "Rising Star",
                        "Earn 50 total points",
                        "⭐",
                        50,
                        totalPoints,
                        totalPoints >= 50
                ),
                new AchievementResponse(
                        "TWO_HUNDRED_POINTS",
                        "Chore Champion",
                        "Earn 200 total points",
                        "🏆",
                        200,
                        totalPoints,
                        totalPoints >= 200
                )
        );
    }

    private int completionCount(Chore chore) {

        if (chore.isRecurring()) {
            return chore.getCompletedDates().size();
        }

        return chore.getStatus() == ChoreStatus.COMPLETED ? 1 : 0;
    }

    @Transactional(readOnly = true)
    public List<ProgressDayResponse> getWeeklyProgress(
            Long groupId,
            Long requesterId,
            Long memberUserId
    ) {
        groupMembershipService.requireMember(groupId, requesterId);
        groupMembershipService.requireMember(groupId, memberUserId);

        LocalDate today = LocalDate.now(applicationZoneId);

        LocalDate weekStart = today.minusDays(
                today.getDayOfWeek().getValue()
                        - DayOfWeek.MONDAY.getValue()
        );

        List<Chore> userChores = choreRepository
                .findAllByGroupId(groupId)
                .stream()
                .filter(chore ->
                        chore.getAssignedUser() != null
                                && chore.getAssignedUser()
                                .getId()
                                .equals(memberUserId)
                )
                .toList();

        return java.util.stream.IntStream.range(0, 7)
                .mapToObj(index -> {

                    LocalDate date = weekStart.plusDays(index);

                    int completedChores = userChores.stream()
                            .mapToInt(chore -> {

                                if (chore.isRecurring()) {
                                    return chore.getCompletedDates()
                                            .contains(date) ? 1 : 0;
                                }

                                if (chore.getStatus() != ChoreStatus.COMPLETED
                                        || chore.getDueDate() == null) {
                                    return 0;
                                }

                                LocalDate choreDate =
                                        chore.getDueDate()
                                                .atZone(applicationZoneId)
                                                .toLocalDate();

                                return choreDate.equals(date)
                                        ? 1
                                        : 0;
                            })
                            .sum();

                    return new ProgressDayResponse(
                            date,
                            date.getDayOfWeek()
                                    .name()
                                    .substring(0, 3),
                            completedChores
                    );
                })
                .toList();
    }


}