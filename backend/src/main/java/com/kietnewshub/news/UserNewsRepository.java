package com.kietnewshub.news;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserNewsRepository extends JpaRepository<UserNewsStory, Long> {
    List<UserNewsStory> findAllByOrderByCreatedAtDesc();
    Optional<UserNewsStory> findByIdAndAuthorUsernameIgnoreCase(Long id, String username);
}