package com.kietnewshub.news;

import com.kietnewshub.auth.HubUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "campus_news_submissions")
public class CampusNewsSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private HubUser author;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(nullable = false, length = 1200)
    private String summary;

    @Column(nullable = false, length = 40)
    private String category;

    @Column(length = 1000)
    private String image;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CampusNewsStatus status = CampusNewsStatus.PENDING;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected CampusNewsSubmission() {}

    public CampusNewsSubmission(HubUser author, String title, String summary, String category, String image) {
        this.author = author;
        this.title = title;
        this.summary = summary;
        this.category = category;
        this.image = image;
    }

    public Long getId() { return id; }
    public HubUser getAuthor() { return author; }
    public String getTitle() { return title; }
    public String getSummary() { return summary; }
    public String getCategory() { return category; }
    public String getImage() { return image; }
    public CampusNewsStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setStatus(CampusNewsStatus status) { this.status = status; }
}