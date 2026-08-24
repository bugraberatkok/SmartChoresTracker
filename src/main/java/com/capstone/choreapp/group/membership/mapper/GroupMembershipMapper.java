package com.capstone.choreapp.group.membership.mapper;
import com.capstone.choreapp.group.membership.dto.GroupMemberResponse;

import org.springframework.stereotype.Component;

import com.capstone.choreapp.group.entity.Group;
import com.capstone.choreapp.group.membership.entity.GroupMembership;
import com.capstone.choreapp.group.membership.entity.GroupRole;
import com.capstone.choreapp.user.entity.User;

@Component
public class GroupMembershipMapper {

    public GroupMembership toEntity(
            User user,
            Group group,
            GroupRole role
    ) {
        GroupMembership membership = new GroupMembership();

        membership.setUser(user);
        membership.setGroup(group);
        membership.setRole(role);

        return membership;
    }

    public GroupMemberResponse toResponse(GroupMembership membership) {
        return new GroupMemberResponse(
                membership.getId(),
                membership.getUser().getId(),
                membership.getUser().getName(),
                membership.getUser().getEmail(),
                membership.getRole(),
                membership.getJoinedAt()
        );
    }
}
