package com.kietnewshub.content;

import com.kietnewshub.auth.HubUser;
import com.kietnewshub.auth.HubUserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/highlights")
public class HighlightController {
    private static final long VIDEO_LIMIT_BYTES = 300L * 1024 * 1024;
    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> VIDEO_TYPES = Set.of("video/mp4", "video/webm", "video/quicktime");

    private final HighlightRepository highlights;
    private final HubUserRepository users;
    private final Path uploadDirectory;

    public HighlightController(HighlightRepository highlights, HubUserRepository users,
                               @Value("${hub.storage.local-directory:./uploads}") String uploadDirectory) {
        this.highlights = highlights;
        this.users = users;
        this.uploadDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize();
    }

    @GetMapping
    public List<HighlightResponse> published() {
        return highlights.findByStatusOrderByCreatedAtDesc(HighlightStatus.PUBLISHED).stream()
                .map(HighlightResponse::from).toList();
    }

        @GetMapping("/{id}/media")
        public ResponseEntity<Resource> media(@PathVariable Long id, Authentication authentication) {
        CampusHighlight post = highlights.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        boolean owner = authentication != null && post.getAuthor().getEmail().equalsIgnoreCase(authentication.getName());
        boolean moderator = authentication != null && authentication.getAuthorities().stream().anyMatch(authority ->
            Set.of("ROLE_EDITOR", "ROLE_ADMIN", "ROLE_SUPER_ADMIN").contains(authority.getAuthority()));
        if (post.getStatus() != HighlightStatus.PUBLISHED && !owner && !moderator) {
            throw new ResponseStatusException(authentication == null ? HttpStatus.UNAUTHORIZED : HttpStatus.FORBIDDEN);
        }
        Resource resource = new FileSystemResource(post.getMediaPath());
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(post.getMediaType()))
            .header("X-Content-Type-Options", "nosniff")
            .body(resource);
        }

    @PostMapping(consumes = "multipart/form-data")
    @PreAuthorize("hasAnyRole('STUDENT','EDITOR','ADMIN','SUPER_ADMIN')")
    public HighlightResponse submit(@RequestParam("media") MultipartFile media,
                                    @RequestParam("caption") @NotBlank @Size(max = 500) String caption,
                                    Authentication authentication) throws IOException {
        if (media.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Media file is required.");
        String contentType = media.getContentType();
        boolean video = contentType != null && VIDEO_TYPES.contains(contentType.toLowerCase());
        boolean image = contentType != null && IMAGE_TYPES.contains(contentType.toLowerCase());
        if (!video && !image) throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Supported formats: JPG, PNG, WebP, MP4, WebM and MOV.");
        if (video && media.getSize() > VIDEO_LIMIT_BYTES) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Videos must be 300 MB or smaller.");
        if (media.getSize() > VIDEO_LIMIT_BYTES) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Media file exceeds the 300 MB upload limit.");
        try (InputStream stream = media.getInputStream()) {
            if (!matchesSignature(contentType, stream.readNBytes(16))) {
                throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "The file contents do not match the selected media type.");
            }
        }

        HubUser author = users.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        Files.createDirectories(uploadDirectory);
        String extension = extensionFor(contentType);
        Path target = uploadDirectory.resolve(UUID.randomUUID() + extension).normalize();
        if (!target.startsWith(uploadDirectory)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid media path.");
        media.transferTo(target);
        CampusHighlight post = new CampusHighlight(author, caption.trim(), target.toString(), contentType);
        post.setStatus(HighlightStatus.PUBLISHED);
        post = highlights.save(post);
        return HighlightResponse.from(post);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT','EDITOR','ADMIN','SUPER_ADMIN')")
    public HighlightResponse edit(@PathVariable Long id, @Valid @RequestBody EditHighlightRequest request,
                                  Authentication authentication) {
        CampusHighlight post = highlights.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        boolean owner = post.getAuthor().getEmail().equalsIgnoreCase(authentication.getName());
        boolean moderator = authentication.getAuthorities().stream().anyMatch(authority ->
                Set.of("ROLE_EDITOR", "ROLE_ADMIN", "ROLE_SUPER_ADMIN").contains(authority.getAuthority()));
        if (!owner && !moderator) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if (post.getStatus() == HighlightStatus.PUBLISHED && !moderator) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Published posts require editorial review to edit.");
        }
        post.setCaption(request.caption().trim());
        if (!moderator) post.setStatus(HighlightStatus.PENDING);
        return HighlightResponse.from(highlights.save(post));
    }

    private String extensionFor(String contentType) {
        return switch (contentType.toLowerCase()) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "video/mp4" -> ".mp4";
            case "video/webm" -> ".webm";
            case "video/quicktime" -> ".mov";
            default -> throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        };
    }

    private boolean matchesSignature(String contentType, byte[] bytes) {
        return switch (contentType.toLowerCase()) {
            case "image/jpeg" -> bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff;
            case "image/png" -> bytes.length >= 8 && (bytes[0] & 0xff) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4e && bytes[3] == 0x47;
            case "image/webp" -> bytes.length >= 12 && ascii(bytes, 0, 4).equals("RIFF") && ascii(bytes, 8, 4).equals("WEBP");
            case "video/mp4" -> bytes.length >= 8 && ascii(bytes, 4, 4).equals("ftyp");
            case "video/quicktime" -> bytes.length >= 12 && ascii(bytes, 4, 4).equals("ftyp") && ascii(bytes, 8, 4).startsWith("qt");
            case "video/webm" -> bytes.length >= 4 && (bytes[0] & 0xff) == 0x1a && (bytes[1] & 0xff) == 0x45 && (bytes[2] & 0xff) == 0xdf && (bytes[3] & 0xff) == 0xa3;
            default -> false;
        };
    }

    private String ascii(byte[] bytes, int offset, int length) {
        return new String(bytes, offset, length, java.nio.charset.StandardCharsets.US_ASCII);
    }

    public record EditHighlightRequest(@NotBlank @Size(max = 500) String caption) {}
    public record HighlightResponse(Long id, String author, String caption, String mediaUrl, String mediaType,
                                    HighlightStatus status, boolean featured, java.time.Instant createdAt) {
        static HighlightResponse from(CampusHighlight post) {
            return new HighlightResponse(post.getId(), post.getAuthor().getDisplayName(), post.getCaption(), "/api/highlights/" + post.getId() + "/media",
                    post.getMediaType(), post.getStatus(), post.isFeatured(), post.getCreatedAt());
        }
    }
}