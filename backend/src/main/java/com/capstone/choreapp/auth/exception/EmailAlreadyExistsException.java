package com.capstone.choreapp.auth.exception;

public class EmailAlreadyExistsException extends RuntimeException {

    public EmailAlreadyExistsException(String email) {
        super("An account already exists with this email: " + email);
    }
}