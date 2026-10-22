package com.kietnewshub.news;

import com.kietnewshub.auth.HubUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "user_news_stories")
public class UserNewsStory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private HubUser author;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(nullable = false, length = 1000)
    private String summary;

    @Column(nullable = false, columnDefinition = "text")
    private String body;

    @Column(nullable = false, length = 90)
    private String category;

    @Column(nullable = false, length = 30)
    private String imageType;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected UserNewsStory() {}

    public UserNewsStory(HubUser author, String title, String summary, String body, String category,
                         String imageType) {
        this.author = author;
        this.title = title;
        this.summary = summary;
        this.body = body;
        this.category = category;
        this.imageType = imageType;
    }

    public Long getId() { return id; }
    public HubUser getAuthor() { return author; }
    public String getTitle() { return title; }
    public String getSummary() { return summary; }
    public String getBody() { return body; }
    public String getCategory() { return category; }
    public String getImageType() { return imageType; }
    public Instant getCreatedAt() { return createdAt; }
}