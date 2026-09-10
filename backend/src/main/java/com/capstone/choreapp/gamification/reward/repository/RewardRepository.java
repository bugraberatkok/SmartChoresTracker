package com.capstone.choreapp.gamification.reward.repository;

import com.capstone.choreapp.gamification.reward.entity.Reward;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RewardRepository extends JpaRepository<Reward, Long> {

    List<Reward> findAllByGroupIdAndActiveTrueOrderByCreatedAtDesc(Long groupId);

    Optional<Reward> findByIdAndGroupId(Long rewardId, Long groupId);
}