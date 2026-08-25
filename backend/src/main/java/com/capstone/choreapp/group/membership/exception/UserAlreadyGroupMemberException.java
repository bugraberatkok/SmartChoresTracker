package com.capstone.choreapp.group.membership.exception;

public class UserAlreadyGroupMemberException extends RuntimeException {

    public UserAlreadyGroupMemberException() {
        super("User is already a member of this group");
    }
}