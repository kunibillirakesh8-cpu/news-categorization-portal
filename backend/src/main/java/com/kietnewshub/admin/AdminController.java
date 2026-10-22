package com.kietnewshub.admin;

import com.kietnewshub.auth.HubUser;
import com.kietnewshub.auth.HubUserRepository;
import com.kietnewshub.auth.Role;
import com.kietnewshub.audit.AuditEventRepository;
import com.kietnewshub.audit.AuditService;
import com.kietnewshub.content.CampusHighlight;
import com.kietnewshub.content.HighlightRepository;
import com.kietnewshub.content.HighlightStatus;
import com.kietnewshub.news.CampusNewsRepository;
import com.kietnewshub.news.CampusNewsStatus;
import com.kietnewshub.news.CampusNewsSubmission;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('EDITOR','ADMIN','SUPER_ADMIN')")
public class AdminController {
    private final HubUserRepository users;
    private final HighlightRepository highlights;
    private final AuditEventRepository auditEvents;
    private final AuditService auditService;
    private final CampusNewsRepository campusNews;
    private final String superAdminEmail;

    public AdminController(HubUserRepository users, HighlightRepository highlights,
                           AuditEventRepository auditEvents, AuditService auditService,
                           CampusNewsRepository campusNews,
                           @Value("${hub.auth.super-admin-email:}") String superAdminEmail) {
        this.users = users;
        this.highlights = highlights;
        this.auditEvents = auditEvents;
        this.auditService = auditService;
        this.campusNews = campusNews;
        this.superAdminEmail = superAdminEmail.trim();
    }

    @GetMapping("/highlights/pending")
    public List<AdminHighlightResponse> pendingHighlights() {
        return highlights.findByStatusOrderByCreatedAtDesc(HighlightStatus.PENDING).stream()
                .map(AdminHighlightResponse::from).toList();
    }

    @PutMapping("/highlights/{id}/decision")
    public AdminHighlightResponse decide(@PathVariable Long id, @Valid @RequestBody DecisionRequest request,
                                         Authentication authentication) {
        CampusHighlight post = highlights.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (post.getStatus() != HighlightStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This submission has already been reviewed.");
        }
        post.setStatus(request.approved() ? HighlightStatus.PUBLISHED : HighlightStatus.REJECTED);
        CampusHighlight reviewed = highlights.save(post);
        auditService.record(authentication.getName(), request.approved() ? "HIGHLIGHT_APPROVED" : "HIGHLIGHT_REJECTED",
            "highlight", String.valueOf(id), "Submission moderation decision");
        return AdminHighlightResponse.from(reviewed);
    }

    @GetMapping("/kiet-news/pending")
    public List<com.kietnewshub.news.CampusNewsController.CampusNewsStory> pendingCampusNews() {
        return campusNews.findByStatusOrderByCreatedAtDesc(CampusNewsStatus.PENDING).stream()
                .map(com.kietnewshub.news.CampusNewsController.CampusNewsStory::from).toList();
    }

    @PutMapping("/kiet-news/{id}/decision")
        public com.kietnewshub.news.CampusNewsController.CampusNewsStory decideCampusNews(
            @PathVariable Long id, @Valid @RequestBody DecisionRequest request, Authentication authentication) {
        CampusNewsSubmission submission = campusNews.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (submission.getStatus() != CampusNewsStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This campus story has already been reviewed.");
        }
        submission.setStatus(request.approved() ? CampusNewsStatus.PUBLISHED : CampusNewsStatus.REJECTED);
        CampusNewsSubmission reviewed = campusNews.save(submission);
        auditService.record(authentication.getName(), request.approved() ? "KIET_NEWS_APPROVED" : "KIET_NEWS_REJECTED",
                "campus-news", String.valueOf(id), "Campus news submission moderation decision");
        return com.kietnewshub.news.CampusNewsController.CampusNewsStory.from(reviewed);
    }

    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public List<UserResponse> users() {
        return users.findAll().stream().map(UserResponse::from).toList();
    }

    @PatchMapping("/users/{id}/suspension")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public UserResponse suspend(@PathVariable Long id, @Valid @RequestBody SuspensionRequest request,
                                Authentication authentication) {
        HubUser user = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        boolean superAdmin = authentication.getAuthorities().stream().anyMatch(authority -> authority.getAuthority().equals("ROLE_SUPER_ADMIN"));
        if (user.getRole() == Role.SUPER_ADMIN || (user.getRole() == Role.ADMIN && !superAdmin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account requires Super Admin privileges to manage.");
        }
        user.setSuspended(request.suspended());
        HubUser updated = users.save(user);
        auditService.record(authentication.getName(), request.suspended() ? "USER_SUSPENDED" : "USER_RESTORED",
                "user", String.valueOf(id), "Account status changed");
        return UserResponse.from(updated);
    }

    @PatchMapping("/users/{id}/role")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public UserResponse changeRole(@PathVariable Long id, @Valid @RequestBody RoleRequest request,
                                   Authentication authentication) {
        HubUser user = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        boolean designatedOwner = !superAdminEmail.isBlank() && user.getEmail().equalsIgnoreCase(superAdminEmail);
        if ((request.role() == Role.SUPER_ADMIN && !designatedOwner)
                || (user.getRole() == Role.SUPER_ADMIN && (!designatedOwner || request.role() != Role.SUPER_ADMIN))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Super Admin is reserved for the configured platform owner.");
        }
        user.setRole(request.role());
        HubUser updated = users.save(user);
        auditService.record(authentication.getName(), "USER_ROLE_CHANGED", "user", String.valueOf(id),
                "Role changed to " + request.role().name());
        return UserResponse.from(updated);
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public List<AuditResponse> auditLogs() {
        return auditEvents.findTop100ByOrderByCreatedAtDesc().stream().map(AuditResponse::from).toList();
    }

    public record DecisionRequest(@NotNull Boolean approved) {}
    public record SuspensionRequest(@NotNull Boolean suspended) {}
    public record RoleRequest(@NotNull Role role) {}
    public record AuditResponse(Long id, String actor, String action, String targetType,
                                String targetId, String details, java.time.Instant createdAt) {
        static AuditResponse from(com.kietnewshub.audit.AuditEvent event) {
            return new AuditResponse(event.getId(), event.getActorEmail(), event.getAction(), event.getTargetType(),
                    event.getTargetId(), event.getDetails(), event.getCreatedAt());
        }
    }
    public record UserResponse(Long id, String email, String displayName, Role role, boolean suspended) {
        static UserResponse from(HubUser user) {
            return new UserResponse(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole(), user.isSuspended());
        }
    }
    public record AdminHighlightResponse(Long id, String author, String caption, String mediaType,
                                         HighlightStatus status, java.time.Instant createdAt) {
        static AdminHighlightResponse from(CampusHighlight post) {
            return new AdminHighlightResponse(post.getId(), post.getAuthor().getDisplayName(), post.getCaption(),
                    post.getMediaType(), post.getStatus(), post.getCreatedAt());
        }
    }
}