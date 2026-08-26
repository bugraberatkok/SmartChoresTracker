package com.capstone.choreapp.group.membership.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.capstone.choreapp.group.membership.entity.GroupMembership;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GroupMembershipRepository
        extends JpaRepository<GroupMembership, Long> {

    boolean existsByUserIdAndGroupId(Long userId, Long groupId);

    Optional<GroupMembership> findByUserIdAndGroupId(
            Long userId,
            Long groupId
    );

    List<GroupMembership> findAllByGroupId(Long groupId);

    List<GroupMembership> findAllByUserId(Long userId);

    @Modifying
    @Query("""
        delete from GroupMembership gm
        where gm.group.id = :groupId
        """)
    void deleteAllByGroupId(
            @Param("groupId") Long groupId
    );
}
