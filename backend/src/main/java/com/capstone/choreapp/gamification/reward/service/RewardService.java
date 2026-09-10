package com.capstone.choreapp.gamification.reward.service;

import com.capstone.choreapp.chore.entity.Chore;
import com.capstone.choreapp.chore.entity.ChoreStatus;
import com.capstone.choreapp.chore.repository.ChoreRepository;
import com.capstone.choreapp.gamification.reward.dto.CreateRewardRequest;
import com.capstone.choreapp.gamification.reward.dto.RewardBalanceResponse;
import com.capstone.choreapp.gamification.reward.dto.RewardRedemptionResponse;
import com.capstone.choreapp.gamification.reward.dto.RewardResponse;
import com.capstone.choreapp.gamification.reward.entity.Reward;
import com.capstone.choreapp.gamification.reward.entity.RewardRedemption;
import com.capstone.choreapp.gamification.reward.repository.RewardRedemptionRepository;
import com.capstone.choreapp.gamification.reward.repository.RewardRepository;
import com.capstone.choreapp.group.entity.Group;
import com.capstone.choreapp.group.exception.GroupNotFoundException;
import com.capstone.choreapp.group.membership.service.GroupMembershipService;
import com.capstone.choreapp.group.repository.GroupRepository;
import com.capstone.choreapp.user.entity.User;
import com.capstone.choreapp.user.exception.UserNotFoundException;
import com.capstone.choreapp.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RewardService {

    private final RewardRepository rewardRepository;
    private final RewardRedemptionRepository rewardRedemptionRepository;
    private final ChoreRepository choreRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final GroupMembershipService groupMembershipService;

    @Transactional(readOnly = true)
    public List<RewardResponse> getRewards(
            Long groupId,
            Long requesterId
    ) {
        groupMembershipService.requireMember(groupId, requesterId);

        return rewardRepository
                .findAllByGroupIdAndActiveTrueOrderByCreatedAtDesc(groupId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public RewardResponse createReward(
            Long groupId,
            Long requesterId,
            CreateRewardRequest request
    ) {
        groupMembershipService.requireManager(groupId, requesterId);

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new GroupNotFoundException(groupId));

        User creator = userRepository.findById(requesterId)
                .orElseThrow(() ->
                        new UserNotFoundException(
                                "Authenticated user was not found"
                        )
                );

        Reward reward = new Reward();
        reward.setGroup(group);
        reward.setCreatedBy(creator);
        reward.setName(request.name().trim());
        reward.setDescription(
                request.description() == null
                        ? null
                        : request.description().trim()
        );
        reward.setCost(request.cost());
        reward.setActive(true);

        return toResponse(rewardRepository.save(reward));
    }

    @Transactional(readOnly = true)
    public RewardBalanceResponse getBalance(
            Long groupId,
            Long requesterId
    ) {
        groupMembershipService.requireMember(groupId, requesterId);

        int earnedPoints = calculateEarnedPoints(
                groupId,
                requesterId
        );

        int spentPoints = Math.toIntExact(
                rewardRedemptionRepository.sumSpentPoints(
                        groupId,
                        requesterId
                )
        );

        return new RewardBalanceResponse(
                earnedPoints,
                spentPoints,
                Math.max(0, earnedPoints - spentPoints)
        );
    }

    @Transactional
    public RewardRedemptionResponse redeemReward(
            Long groupId,
            Long requesterId,
            Long rewardId
    ) {
        groupMembershipService.requireMember(groupId, requesterId);

        Reward reward = rewardRepository
                .findByIdAndGroupId(rewardId, groupId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Reward was not found"
                        )
                );

        if (!reward.isActive()) {
            throw new IllegalArgumentException(
                    "Reward is no longer available"
            );
        }

        User user = userRepository.findById(requesterId)
                .orElseThrow(() ->
                        new UserNotFoundException(
                                "Authenticated user was not found"
                        )
                );

        int earnedPoints = calculateEarnedPoints(
                groupId,
                requesterId
        );

        int spentPoints = Math.toIntExact(
                rewardRedemptionRepository.sumSpentPoints(
                        groupId,
                        requesterId
                )
        );

        int availablePoints = earnedPoints - spentPoints;

        if (availablePoints < reward.getCost()) {
            throw new IllegalArgumentException(
                    "Not enough points to redeem this reward"
            );
        }

        RewardRedemption redemption = new RewardRedemption();
        redemption.setReward(reward);
        redemption.setUser(user);
        redemption.setCostSnapshot(reward.getCost());

        RewardRedemption saved =
                rewardRedemptionRepository.save(redemption);

        return new RewardRedemptionResponse(
                saved.getId(),
                reward.getId(),
                reward.getName(),
                reward.getCost(),
                availablePoints - reward.getCost(),
                saved.getRedeemedAt()
        );
    }

    @Transactional
    public void deactivateReward(
            Long groupId,
            Long requesterId,
            Long rewardId
    ) {
        groupMembershipService.requireManager(
                groupId,
                requesterId
        );

        Reward reward = rewardRepository
                .findByIdAndGroupId(rewardId, groupId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Reward was not found"
                        )
                );

        reward.setActive(false);
    }

    private int calculateEarnedPoints(
            Long groupId,
            Long userId
    ) {
        return choreRepository.findAllByGroupId(groupId)
                .stream()
                .filter(chore ->
                        chore.getAssignedUser() != null
                                && chore.getAssignedUser()
                                .getId()
                                .equals(userId)
                )
                .mapToInt(chore ->
                        (chore.getPoints() == null
                                ? 0
                                : chore.getPoints())
                                * completionCount(chore)
                )
                .sum();
    }

    private int completionCount(Chore chore) {
        if (chore.isRecurring()) {
            return chore.getCompletedDates().size();
        }

        return chore.getStatus() == ChoreStatus.COMPLETED
                ? 1
                : 0;
    }

    private RewardResponse toResponse(Reward reward) {
        return new RewardResponse(
                reward.getId(),
                reward.getName(),
                reward.getDescription(),
                reward.getCost(),
                reward.isActive(),
                reward.getCreatedAt()
        );
    }
}