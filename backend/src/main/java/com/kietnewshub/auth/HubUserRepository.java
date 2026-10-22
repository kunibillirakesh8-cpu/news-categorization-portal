package com.kietnewshub.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HubUserRepository extends JpaRepository<HubUser, Long> {
    Optional<HubUser> findByUsernameIgnoreCase(String username);
    Optional<HubUser> findByEmailIgnoreCase(String email);
    boolean existsByUsernameIgnoreCase(String username);
    boolean existsByEmailIgnoreCase(String email);
}