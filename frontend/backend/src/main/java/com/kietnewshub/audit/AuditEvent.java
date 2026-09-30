package com.kietnewshub.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "audit_events")
public class AuditEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 254)
    private String actorEmail;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(nullable = false, length = 50)
    private String targetType;

    @Column(nullable = false, length = 100)
    private String targetId;

    @Column(nullable = false, length = 1000)
    private String details;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected AuditEvent() {}

    public AuditEvent(String actorEmail, String action, String targetType, String targetId, String details) {
        this.actorEmail = actorEmail;
        this.action = action;
        this.targetType = targetType;
        this.targetId = targetId;
        this.details = details;
    }

    public Long getId() { return id; }
    public String getActorEmail() { return actorEmail; }
    public String getAction() { return action; }
    public String getTargetType() { return targetType; }
    public String getTargetId() { return targetId; }
    public String getDetails() { return details; }
    public Instant getCreatedAt() { return createdAt; }
}