package com.kietnewshub.news;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CampusNewsRepository extends JpaRepository<CampusNewsSubmission, Long> {
    List<CampusNewsSubmission> findByStatusOrderByCreatedAtDesc(CampusNewsStatus status);
    Optional<CampusNewsSubmission> findByIdAndAuthorUsernameIgnoreCase(Long id, String username);
}