package com.capstone.choreapp.gamification.reward.repository;

import com.capstone.choreapp.gamification.reward.entity.RewardRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;

import java.util.List;

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

    @Query("""
            select r from RewardRedemption r
            where r.reward.group.id = :groupId
              and r.user.id = :userId
            order by r.redeemedAt desc
            """)
    List<RewardRedemption> findHistory(
            @Param("groupId") Long groupId,
            @Param("userId") Long userId
    );

    @Modifying
    @Query("delete from RewardRedemption redemption where redemption.reward.group.id = :groupId")
    void deleteAllByGroupId(@Param("groupId") Long groupId);
}
