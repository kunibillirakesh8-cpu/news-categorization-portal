package com.kietnewshub.news;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CampusNewsRepository extends JpaRepository<CampusNewsSubmission, Long> {
    List<CampusNewsSubmission> findByStatusOrderByCreatedAtDesc(CampusNewsStatus status);
}