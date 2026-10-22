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
        for (HubUser user : users.findAll()) {
            if (user.getUsername() != null && !user.getUsername().isBlank()) continue;
            String base = user.getEmail() == null ? user.getDisplayName() : user.getEmail().split("@", 2)[0];
            base = base.replaceAll("[^A-Za-z0-9._]", "");
            if (base.length() < 3) base = "user";
            int collision = 0;
            String suffix;
            String username;
            do {
                suffix = "_" + user.getId() + (collision == 0 ? "" : "_" + collision);
                username = base.substring(0, Math.min(base.length(), 30 - suffix.length())) + suffix;
                collision++;
            } while (users.existsByUsernameIgnoreCase(username));
            user.setUsername(username);
            users.save(user);
        }
        if (ownerEmail.isBlank()) return;
        users.findByEmailIgnoreCase(ownerEmail).ifPresent(owner -> {
            if (owner.getRole() != Role.SUPER_ADMIN) {
                owner.setRole(Role.SUPER_ADMIN);
                users.save(owner);
            }
        });
    }
}