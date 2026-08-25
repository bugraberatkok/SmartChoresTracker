package com.capstone.choreapp.group.membership.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.capstone.choreapp.group.membership.entity.GroupMembership;

public interface GroupMembershipRepository
        extends JpaRepository<GroupMembership, Long> {

    boolean existsByUserIdAndGroupId(Long userId, Long groupId);

    Optional<GroupMembership> findByUserIdAndGroupId(
            Long userId,
            Long groupId
    );

    List<GroupMembership> findAllByGroupId(Long groupId);
}
