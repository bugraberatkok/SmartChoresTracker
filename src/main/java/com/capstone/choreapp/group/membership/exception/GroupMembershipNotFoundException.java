package com.capstone.choreapp.group.membership.exception;

public class GroupMembershipNotFoundException extends RuntimeException {

    public GroupMembershipNotFoundException() {
        super("User is not a member of this group");
    }
}