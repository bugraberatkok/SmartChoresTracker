package com.capstone.choreapp.group.mapper;

import com.capstone.choreapp.group.dto.CreateGroupRequest;
import com.capstone.choreapp.group.dto.GroupResponse;
import com.capstone.choreapp.group.entity.Group;
import com.capstone.choreapp.user.entity.User;
import org.springframework.stereotype.Component;
import com.capstone.choreapp.group.dto.UpdateGroupRequest;

@Component
public class GroupMapper {

    public Group toEntity(CreateGroupRequest request, User owner) {
        Group group = new Group();

        group.setName(request.name());
        group.setDescription(request.description());
        group.setOwner(owner);

        return group;
    }

    public GroupResponse toResponse(Group group) {
        return new GroupResponse(
                group.getId(),
                group.getName(),
                group.getDescription(),
                group.getOwner().getId(),
                group.getInviteCode(),
                group.getCreatedAt(),
                group.getUpdatedAt()
        );
    }

    public void updateEntity(Group group, UpdateGroupRequest request) {
        if (request.name() != null) {
            group.setName(request.name().trim());
        }

        if (request.description() != null) {
            group.setDescription(request.description().trim());
        }
    }
}