package com.kietnewshub.content;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HighlightRepository extends JpaRepository<CampusHighlight, Long> {
    List<CampusHighlight> findByStatusOrderByCreatedAtDesc(HighlightStatus status);
    Optional<CampusHighlight> findByIdAndAuthorEmailIgnoreCase(Long id, String email);
}