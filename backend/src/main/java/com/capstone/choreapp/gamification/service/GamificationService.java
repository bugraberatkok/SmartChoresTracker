package com.capstone.choreapp.gamification.service;

import com.capstone.choreapp.chore.entity.Chore;
import com.capstone.choreapp.chore.entity.ChoreStatus;
import com.capstone.choreapp.chore.repository.ChoreRepository;
import com.capstone.choreapp.gamification.dto.AchievementResponse;
import com.capstone.choreapp.gamification.dto.LeaderboardEntryResponse;
import com.capstone.choreapp.gamification.dto.ProgressDayResponse;
import com.capstone.choreapp.gamification.dto.StreakResponse;
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
import java.util.HashSet;
import java.util.Set;

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

        Set<LocalDate> activeDates = collectActiveDates(userChores);

        LocalDate today = LocalDate.now(applicationZoneId);

        LocalDate lastActiveDate = activeDates.stream()
                .max(LocalDate::compareTo)
                .orElse(null);

        int currentStreak = lastActiveDate == null
                ? 0
                : calculateCurrentStreak(
                activeDates,
                today,
                lastActiveDate
        );

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
                        "FIVE_CHORES",
                        "Getting Productive",
                        "Complete 5 chores",
                        "🧹",
                        5,
                        completedChores,
                        completedChores >= 5
                ),

                new AchievementResponse(
                        "TWENTY_FIVE_CHORES",
                        "Chore Machine",
                        "Complete 25 chores",
                        "💪",
                        25,
                        completedChores,
                        completedChores >= 25
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
                ),

                new AchievementResponse(
                        "FIVE_HUNDRED_POINTS",
                        "Point Collector",
                        "Earn 500 total points",
                        "💎",
                        500,
                        totalPoints,
                        totalPoints >= 500
                ),

                new AchievementResponse(
                        "THREE_DAY_STREAK",
                        "On Fire",
                        "Keep a 3 day streak",
                        "🔥",
                        3,
                        currentStreak,
                        currentStreak >= 3
                ),

                new AchievementResponse(
                        "SEVEN_DAY_STREAK",
                        "Unstoppable",
                        "Keep a 7 day streak",
                        "⚡",
                        7,
                        currentStreak,
                        currentStreak >= 7
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

    @Transactional(readOnly = true)
    public StreakResponse getStreak(
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

        Set<LocalDate> activeDates = collectActiveDates(userChores);

        if (activeDates.isEmpty()) {
            return new StreakResponse(0, 0, null);
        }

        LocalDate today = LocalDate.now(applicationZoneId);
        LocalDate lastActiveDate = activeDates.stream()
                .max(LocalDate::compareTo)
                .orElseThrow();

        int currentStreak = calculateCurrentStreak(
                activeDates,
                today,
                lastActiveDate
        );

        int longestStreak = calculateLongestStreak(activeDates);

        return new StreakResponse(
                currentStreak,
                longestStreak,
                lastActiveDate
        );
    }

    private int calculateCurrentStreak(
            Set<LocalDate> activeDates,
            LocalDate today,
            LocalDate lastActiveDate
    ) {
        if (
                !lastActiveDate.equals(today)
                        && !lastActiveDate.equals(today.minusDays(1))
        ) {
            return 0;
        }

        int streak = 0;
        LocalDate date = lastActiveDate;

        while (activeDates.contains(date)) {
            streak++;
            date = date.minusDays(1);
        }

        return streak;
    }

    private int calculateLongestStreak(Set<LocalDate> activeDates) {
        List<LocalDate> sortedDates = activeDates.stream()
                .sorted()
                .toList();

        int longest = 0;
        int current = 0;
        LocalDate previous = null;

        for (LocalDate date : sortedDates) {
            if (previous == null || date.equals(previous.plusDays(1))) {
                current++;
            } else {
                current = 1;
            }

            longest = Math.max(longest, current);
            previous = date;
        }

        return longest;
    }

    private Set<LocalDate> collectActiveDates(List<Chore> chores) {

        Set<LocalDate> activeDates = new HashSet<>();

        for (Chore chore : chores) {

            if (chore.isRecurring()) {
                activeDates.addAll(chore.getCompletedDates());
                continue;
            }

            if (
                    chore.getStatus() == ChoreStatus.COMPLETED
                            && chore.getCompletedAt() != null
            ) {
                LocalDate completedDate =
                        chore.getCompletedAt()
                                .atZone(applicationZoneId)
                                .toLocalDate();

                activeDates.add(completedDate);
            }
        }

        return activeDates;
    }

}