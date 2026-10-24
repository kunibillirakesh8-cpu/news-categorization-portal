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
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
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
    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/jpg", "image/pjpeg", "image/x-png");
    private static final Set<String> VIDEO_TYPES = Set.of("video/mp4", "video/webm", "video/quicktime");

    private final HighlightRepository highlights;
    private final HighlightMediaRepository mediaFiles;
    private final HubUserRepository users;
    private final Path uploadDirectory;

    public HighlightController(HighlightRepository highlights, HighlightMediaRepository mediaFiles, HubUserRepository users,
                               @Value("${hub.storage.local-directory:./uploads}") String uploadDirectory) {
        this.highlights = highlights;
        this.mediaFiles = mediaFiles;
        this.users = users;
        this.uploadDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize();
    }

    @GetMapping
    public List<HighlightResponse> published(Authentication authentication) {
        return highlights.findByStatusOrderByCreatedAtDesc(HighlightStatus.PUBLISHED).stream()
                .map(post -> HighlightResponse.from(post, authentication)).toList();
    }

    @GetMapping("/{id}/media")
    public ResponseEntity<Resource> media(@PathVariable Long id, Authentication authentication) {
        CampusHighlight post = highlights.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        boolean owner = authentication != null && post.getAuthor().getUsername().equalsIgnoreCase(authentication.getName());
        boolean moderator = authentication != null && authentication.getAuthorities().stream().anyMatch(authority ->
            Set.of("ROLE_EDITOR", "ROLE_ADMIN", "ROLE_SUPER_ADMIN").contains(authority.getAuthority()));
        if (post.getStatus() != HighlightStatus.PUBLISHED && !owner && !moderator) {
            throw new ResponseStatusException(authentication == null ? HttpStatus.UNAUTHORIZED : HttpStatus.FORBIDDEN);
        }
        var storedMedia = mediaFiles.findById(id);
        Resource resource = storedMedia
            .<Resource>map(media -> new ByteArrayResource(media.getData()))
            .orElseGet(() -> new FileSystemResource(post.getMediaPath()));
        String mediaType = storedMedia.map(HighlightMedia::getContentType).orElse(post.getMediaType());
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(mediaType))
            .header("X-Content-Type-Options", "nosniff")
            .header("Cache-Control", "public, max-age=86400")
            .body(resource);
    }

    @PostMapping(consumes = "multipart/form-data")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public HighlightResponse submit(@RequestParam("media") MultipartFile media,
                                    @RequestParam("caption") @NotBlank @Size(max = 500) String caption,
                                    Authentication authentication) throws IOException {
        String safeCaption = normalizeCaption(caption);
        if (safeCaption.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Caption must contain readable text.");
        }
        if (media.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Media file is required.");
        String contentType = resolveContentType(media);
        boolean video = VIDEO_TYPES.contains(contentType);
        boolean image = IMAGE_TYPES.contains(contentType);
        if (!video && !image) throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Supported formats: JPG, PNG, WebP, MP4, WebM and MOV.");
        if (video && media.getSize() > VIDEO_LIMIT_BYTES) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Videos must be 300 MB or smaller.");
        if (media.getSize() > VIDEO_LIMIT_BYTES) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Media file exceeds the 300 MB upload limit.");
        try (InputStream stream = media.getInputStream()) {
            byte[] header = stream.readNBytes(64);
            if (!matchesSignature(contentType, header)) {
                throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "The file contents do not match the selected media type.");
            }
        }

        HubUser author = users.findByUsernameIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        CampusHighlight post = new CampusHighlight(author, safeCaption, "", contentType);
        post.setStatus(HighlightStatus.PUBLISHED);
        post = highlights.save(post);
        mediaFiles.save(new HighlightMedia(post.getId(), contentType, media.getBytes()));
        return HighlightResponse.from(post, authentication);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT','EDITOR','ADMIN','SUPER_ADMIN')")
    @Transactional
    public void delete(@PathVariable Long id, Authentication authentication) {
        CampusHighlight post = highlights.findByIdAndAuthorUsernameIgnoreCase(id, authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        mediaFiles.deleteById(id);
        if (post.getMediaPath() != null && !post.getMediaPath().isBlank()) {
            Path legacyPath = Path.of(post.getMediaPath()).toAbsolutePath().normalize();
            if (legacyPath.startsWith(uploadDirectory)) {
                try {
                    Files.deleteIfExists(legacyPath);
                } catch (IOException error) {
                    throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not remove the uploaded media.");
                }
            }
        }
        highlights.delete(post);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT','EDITOR','ADMIN','SUPER_ADMIN')")
    public HighlightResponse edit(@PathVariable Long id, @Valid @RequestBody EditHighlightRequest request,
                                  Authentication authentication) {
        CampusHighlight post = highlights.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        boolean owner = post.getAuthor().getUsername().equalsIgnoreCase(authentication.getName());
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

    static String normalizeCaption(String rawCaption) {
        if (rawCaption == null) return "";
        String cleaned = rawCaption
                .replaceAll("[\\p{Cntrl}&&[^\\r\\n\\t]]+", "")
                .replaceAll("[\\r\\n\\t]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return cleaned.length() > 500 ? cleaned.substring(0, 500).trim() : cleaned;
    }

    static String resolveContentType(MultipartFile media) {
        String ct = media.getContentType();
        if (ct != null && !ct.isBlank() && !"application/octet-stream".equalsIgnoreCase(ct)) {
            return ct.toLowerCase();
        }
        String filename = media.getOriginalFilename();
        if (filename != null) {
            String lower = filename.toLowerCase();
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".jfif")) return "image/jpeg";
            if (lower.endsWith(".png")) return "image/png";
            if (lower.endsWith(".webp")) return "image/webp";
            if (lower.endsWith(".mp4")) return "video/mp4";
            if (lower.endsWith(".webm")) return "video/webm";
            if (lower.endsWith(".mov")) return "video/quicktime";
        }
        return ct != null ? ct.toLowerCase() : "";
    }

    private String extensionFor(String contentType) {
        return switch (contentType.toLowerCase()) {
            case "image/jpeg", "image/jpg", "image/pjpeg" -> ".jpg";
            case "image/png", "image/x-png" -> ".png";
            case "image/webp" -> ".webp";
            case "video/mp4" -> ".mp4";
            case "video/webm" -> ".webm";
            case "video/quicktime" -> ".mov";
            default -> throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        };
    }

    private boolean matchesSignature(String contentType, byte[] bytes) {
        if (bytes == null || bytes.length == 0) return false;
        String asciiStr = ascii(bytes, 0, bytes.length);
        return switch (contentType.toLowerCase()) {
            case "image/jpeg", "image/jpg", "image/pjpeg" -> bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff;
            case "image/png", "image/x-png" -> bytes.length >= 8 && (bytes[0] & 0xff) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4e && bytes[3] == 0x47;
            case "image/webp" -> bytes.length >= 12 && ascii(bytes, 0, 4).equals("RIFF") && ascii(bytes, 8, 4).equals("WEBP");
            case "video/mp4" -> asciiStr.contains("ftyp") || (bytes.length >= 8 && ascii(bytes, 4, 4).equals("ftyp"));
            case "video/quicktime" -> asciiStr.contains("ftyp") || asciiStr.contains("moov") || asciiStr.contains("wide") || asciiStr.contains("mdat");
            case "video/webm" -> bytes.length >= 4 && (bytes[0] & 0xff) == 0x1a && (bytes[1] & 0xff) == 0x45 && (bytes[2] & 0xff) == 0xdf && (bytes[3] & 0xff) == 0xa3;
            default -> false;
        };
    }

    private String ascii(byte[] bytes, int offset, int length) {
        int actualLen = Math.min(length, Math.max(0, bytes.length - offset));
        return new String(bytes, offset, actualLen, java.nio.charset.StandardCharsets.US_ASCII);
    }

    public record EditHighlightRequest(@NotBlank @Size(max = 500) String caption) {}
    public record HighlightResponse(Long id, String author, String caption, String mediaUrl, String mediaType,
                                    HighlightStatus status, boolean featured, java.time.Instant createdAt,
                                    boolean ownedByCurrentUser) {
        static HighlightResponse from(CampusHighlight post) {
            return from(post, null);
        }

        static HighlightResponse from(CampusHighlight post, Authentication authentication) {
            boolean owner = authentication != null && post.getAuthor().getUsername().equalsIgnoreCase(authentication.getName());
            return new HighlightResponse(post.getId(), post.getAuthor().getDisplayName(), post.getCaption(), "/api/highlights/" + post.getId() + "/media",
                    post.getMediaType(), post.getStatus(), post.isFeatured(), post.getCreatedAt(), owner);
        }
    }
}