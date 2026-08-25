package com.capstone.choreapp.chore.repository;

import com.capstone.choreapp.chore.entity.Chore;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChoreRepository extends JpaRepository<Chore, Long> {

    List<Chore> findAllByGroupId(Long groupId);
}