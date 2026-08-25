package com.capstone.choreapp.group.exception;

public class GroupNotFoundException extends RuntimeException {

    public GroupNotFoundException(Long groupId) {
        super("Group with id " + groupId + " was not found");
    }
}