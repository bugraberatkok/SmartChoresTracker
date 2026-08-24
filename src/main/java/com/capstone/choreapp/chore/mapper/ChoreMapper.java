package com.capstone.choreapp.chore.mapper;

import com.capstone.choreapp.chore.dto.ChoreResponse;
import com.capstone.choreapp.chore.entity.Chore;
import org.springframework.stereotype.Component;

@Component
public class ChoreMapper {

    public ChoreResponse toResponse(Chore chore) {
        return new ChoreResponse(
                chore.getId(),
                chore.getTitle(),
                chore.getDescription(),
                chore.getGroup().getId(),
                chore.getAssignedUser() != null
                        ? chore.getAssignedUser().getId()
                        : null,
                chore.getCreatedBy().getId(),
                chore.getStatus(),
                chore.getPoints(),
                chore.getDueDate(),
                chore.getCompletedAt(),
                chore.getCreatedAt(),
                chore.getUpdatedAt()
        );
    }
}