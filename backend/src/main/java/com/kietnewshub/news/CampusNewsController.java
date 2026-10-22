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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
    public List<CampusNewsStory> published(Authentication authentication) {
        return submissions.findByStatusOrderByCreatedAtDesc(CampusNewsStatus.PUBLISHED).stream()
                .map(item -> CampusNewsStory.from(item, authentication)).toList();
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
        var user = users.findByUsernameIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        var submission = new CampusNewsSubmission(user, request.title().trim(), request.summary().trim(), request.category(), request.image());
        submission.setStatus(CampusNewsStatus.PUBLISHED);
        submission = submissions.save(submission);
        return CampusNewsStory.from(submission, authentication);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('STUDENT','EDITOR','ADMIN','SUPER_ADMIN')")
    public List<CampusNewsStory> mySubmissions(Authentication authentication) {
        return submissions.findAll().stream()
                .filter(item -> item.getAuthor().getUsername().equalsIgnoreCase(authentication.getName()))
                .map(item -> CampusNewsStory.from(item, authentication)).toList();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT','EDITOR','ADMIN','SUPER_ADMIN')")
    public void delete(@PathVariable String id, Authentication authentication) {
        if (!id.matches("k-user-\\d+")) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        long databaseId = Long.parseLong(id.substring("k-user-".length()));
        CampusNewsSubmission submission = submissions.findByIdAndAuthorUsernameIgnoreCase(databaseId, authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        submissions.delete(submission);
    }

    public record CampusNewsRequest(@NotBlank @Size(max = 180) String title,
                                   @NotBlank @Size(max = 1200) String summary,
                                   @NotBlank String category,
                                   @Size(max = 1000) String image) {}
    public record CampusNewsStory(String id, String title, String summary, String category, String source,
                                  String image, String status, Instant publishedAt, boolean ownedByCurrentUser) {
        public static CampusNewsStory from(CampusNewsSubmission item, Authentication authentication) {
            boolean owner = authentication != null && item.getAuthor().getUsername().equalsIgnoreCase(authentication.getName());
            return new CampusNewsStory("k-user-" + item.getId(), item.getTitle(), item.getSummary(), item.getCategory(),
                    item.getAuthor().getDisplayName(), item.getImage(), item.getStatus().name(), item.getCreatedAt(), owner);
        }
    }
}