package com.capstone.choreapp.chore.exception;

public class ChoreNotFoundException extends RuntimeException {

    public ChoreNotFoundException(Long choreId) {
        super("Chore with id " + choreId + " was not found");
    }
}