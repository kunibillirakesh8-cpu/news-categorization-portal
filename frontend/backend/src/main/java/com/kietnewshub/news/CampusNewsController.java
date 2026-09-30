package com.kietnewshub.news;

import com.kietnewshub.auth.HubUserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/kiet-news")
public class CampusNewsController {
    private static final Set<String> CATEGORIES = Set.of("Events", "Placements", "Achievements", "Faculty", "Workshops", "Hackathons", "Sports", "Clubs", "Departments", "Announcements");
    private final CampusNewsRepository submissions;
    private final HubUserRepository users;

    public CampusNewsController(CampusNewsRepository submissions, HubUserRepository users) {
        this.submissions = submissions;
        this.users = users;
    }

    @GetMapping
    public List<CampusNewsStory> published() {
        return submissions.findByStatusOrderByCreatedAtDesc(CampusNewsStatus.PUBLISHED).stream()
                .map(CampusNewsStory::from).toList();
    }

    @PostMapping({"", "/submissions"})
    @PreAuthorize("hasAnyRole('STUDENT','EDITOR','ADMIN','SUPER_ADMIN')")
    public CampusNewsStory submit(@Valid @RequestBody CampusNewsRequest request, Authentication authentication) {
        if (!CATEGORIES.contains(request.category())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid campus news category.");
        if (request.image() != null && !request.image().isBlank()) {
            URI image = URI.create(request.image());
            if (!"https".equalsIgnoreCase(image.getScheme()) || image.getHost() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image must use a public HTTPS URL.");
            }
        }
        var user = users.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        var submission = new CampusNewsSubmission(user, request.title().trim(), request.summary().trim(), request.category(), request.image());
        submission.setStatus(CampusNewsStatus.PUBLISHED);
        submission = submissions.save(submission);
        return CampusNewsStory.from(submission);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('STUDENT','EDITOR','ADMIN','SUPER_ADMIN')")
    public List<CampusNewsStory> mySubmissions(Authentication authentication) {
        return submissions.findAll().stream()
                .filter(item -> item.getAuthor().getEmail().equalsIgnoreCase(authentication.getName()))
                .map(CampusNewsStory::from).toList();
    }

    public record CampusNewsRequest(@NotBlank @Size(max = 180) String title,
                                   @NotBlank @Size(max = 1200) String summary,
                                   @NotBlank String category,
                                   @Size(max = 1000) String image) {}
    public record CampusNewsStory(String id, String title, String summary, String category, String source,
                                  String image, String status, Instant publishedAt) {
        public static CampusNewsStory from(CampusNewsSubmission item) {
            return new CampusNewsStory("k-user-" + item.getId(), item.getTitle(), item.getSummary(), item.getCategory(),
                    item.getAuthor().getDisplayName(), item.getImage(), item.getStatus().name(), item.getCreatedAt());
        }
    }
}