package com.kietnewshub.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class SuperAdminBootstrap implements ApplicationRunner {
    private final HubUserRepository users;
    private final String ownerEmail;

    public SuperAdminBootstrap(HubUserRepository users, @Value("${hub.auth.super-admin-email:}") String ownerEmail) {
        this.users = users;
        this.ownerEmail = ownerEmail.trim();
    }

    @Override
    public void run(ApplicationArguments args) {
        if (ownerEmail.isBlank()) return;
        users.findByEmailIgnoreCase(ownerEmail).ifPresent(owner -> {
            if (owner.getRole() != Role.SUPER_ADMIN) {
                owner.setRole(Role.SUPER_ADMIN);
                users.save(owner);
            }
        });
    }
}