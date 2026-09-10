package com.capstone.choreapp.gamification.reward.repository;

import com.capstone.choreapp.gamification.reward.entity.RewardRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RewardRedemptionRepository
        extends JpaRepository<RewardRedemption, Long> {

    @Query("""
            select coalesce(sum(r.costSnapshot), 0)
            from RewardRedemption r
            where r.reward.group.id = :groupId
              and r.user.id = :userId
            """)
    Long sumSpentPoints(
            @Param("groupId") Long groupId,
            @Param("userId") Long userId
    );
}