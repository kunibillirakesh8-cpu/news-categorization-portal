package com.kietnewshub.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HubUserRepository extends JpaRepository<HubUser, Long> {
    Optional<HubUser> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
}