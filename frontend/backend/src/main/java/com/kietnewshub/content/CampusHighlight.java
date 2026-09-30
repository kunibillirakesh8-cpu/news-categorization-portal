package com.kietnewshub.content;

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
@Table(name = "campus_highlights")
public class CampusHighlight {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private HubUser author;

    @Column(nullable = false, length = 500)
    private String caption;

    @Column(nullable = false, length = 500)
    private String mediaPath;

    @Column(nullable = false, length = 30)
    private String mediaType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private HighlightStatus status = HighlightStatus.PENDING;

    @Column(nullable = false)
    private boolean featured;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected CampusHighlight() {}

    public CampusHighlight(HubUser author, String caption, String mediaPath, String mediaType) {
        this.author = author;
        this.caption = caption;
        this.mediaPath = mediaPath;
        this.mediaType = mediaType;
    }

    public Long getId() { return id; }
    public HubUser getAuthor() { return author; }
    public String getCaption() { return caption; }
    public String getMediaPath() { return mediaPath; }
    public String getMediaType() { return mediaType; }
    public HighlightStatus getStatus() { return status; }
    public boolean isFeatured() { return featured; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCaption(String caption) { this.caption = caption; }
    public void setStatus(HighlightStatus status) { this.status = status; }
    public void setFeatured(boolean featured) { this.featured = featured; }
}