package com.capstone.choreapp.group.membership.dto;

import com.capstone.choreapp.group.membership.entity.GroupRole;
import jakarta.validation.constraints.NotNull;

public record UpdateGroupRoleRequest(

        @NotNull(message = "Role is required")
        GroupRole role

) {
}