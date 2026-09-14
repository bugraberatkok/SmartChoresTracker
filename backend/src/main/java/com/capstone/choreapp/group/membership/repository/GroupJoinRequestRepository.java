package com.capstone.choreapp.group.membership.repository;

import com.capstone.choreapp.group.membership.entity.GroupJoinRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GroupJoinRequestRepository extends JpaRepository<GroupJoinRequest, Long> {
    boolean existsByUserIdAndGroupId(Long userId, Long groupId);
    List<GroupJoinRequest> findAllByGroupIdOrderByRequestedAtAsc(Long groupId);
    void deleteAllByGroupId(Long groupId);
}
