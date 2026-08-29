package com.capstone.choreapp.group.repository;

import com.capstone.choreapp.group.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GroupRepository extends JpaRepository<Group, Long> {
    List<Group> findAllByOwnerId(Long ownerId);
    Optional<Group> findByIdAndOwnerId(Long groupId, Long ownerId);
    Optional<Group> findByInviteCode(String inviteCode);
}