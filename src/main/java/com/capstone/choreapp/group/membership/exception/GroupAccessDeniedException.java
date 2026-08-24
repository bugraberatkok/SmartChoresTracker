package com.capstone.choreapp.group.membership.exception;

public class GroupAccessDeniedException extends RuntimeException {

    public GroupAccessDeniedException() {
        super("You do not have permission to perform this action");
    }
}