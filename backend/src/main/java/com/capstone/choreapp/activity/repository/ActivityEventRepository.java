package com.capstone.choreapp.activity.repository;

import com.capstone.choreapp.activity.entity.ActivityEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActivityEventRepository
        extends JpaRepository<ActivityEvent, Long> {

    List<ActivityEvent>
    findTop20ByGroupIdOrderByCreatedAtDesc(Long groupId);
}