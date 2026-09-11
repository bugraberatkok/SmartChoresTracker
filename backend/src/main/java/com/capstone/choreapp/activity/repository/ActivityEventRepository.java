package com.capstone.choreapp.activity.repository;

import com.capstone.choreapp.activity.entity.ActivityEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ActivityEventRepository
        extends JpaRepository<ActivityEvent, Long> {

    List<ActivityEvent>
    findTop20ByGroupIdOrderByCreatedAtDesc(Long groupId);

    @Modifying
    @Query("delete from ActivityEvent event where event.group.id = :groupId")
    void deleteAllByGroupId(@Param("groupId") Long groupId);
}
