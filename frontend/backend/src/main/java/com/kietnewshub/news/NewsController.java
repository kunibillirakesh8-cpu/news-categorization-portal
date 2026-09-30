package com.kietnewshub.news;

import com.kietnewshub.auth.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.client.RestClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

@RestController
@RequestMapping("/api/news")
public class NewsController {
    private static final Set<String> DAILY_CATEGORIES = Set.of("India", "Telangana", "Hyderabad", "Education", "Technology", "AI", "Science", "Business", "Sports", "Entertainment", "World", "Jobs");
    private final NewsClassificationService classifier;
    private final List<NewsStory> demoStories = List.of(
            new NewsStory("n1", "India’s next tech wave is being built far beyond its biggest metros", "A new generation of campuses and founders is redrawing the country’s innovation map.", "Technology", "The Daily Brief", "https://images.unsplash.com/photo-1519389950473-47ba0277781c", Instant.parse("2026-09-29T08:48:00Z")),
            new NewsStory("n2", "Hyderabad expands its clean-mobility network with 40 new electric buses", "The city’s latest transport plan adds new routes connecting fast-growing neighbourhoods.", "Hyderabad", "City Desk", "https://images.unsplash.com/photo-1570168007204-dfb528c6958f", Instant.parse("2026-09-29T08:20:00Z")),
            new NewsStory("n3", "Research teams turn agricultural waste into a lower-cost battery material", "The early-stage process could help make energy storage more affordable and local.", "Science", "Science Today", "https://images.unsplash.com/photo-1531482615713-2afd69097998", Instant.parse("2026-09-29T07:58:00Z")));
    private final ConcurrentMap<String, NewsStory> collectedStories = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, NewsStory> userPublishedStories = new ConcurrentHashMap<>();
    private final RestClient restClient;
    private final String configuredFeeds;
    private final Path uploadDirectory;

    public NewsController(NewsClassificationService classifier, RestClient.Builder restClientBuilder,
                          @Value("${hub.news.feed-urls:}") String configuredFeeds,
                          @Value("${hub.storage.local-directory:./uploads}") String uploadDirectory) {
        this.classifier = classifier;
        this.restClient = restClientBuilder.build();
        this.configuredFeeds = configuredFeeds;
        this.uploadDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize().resolve("news");
        demoStories.forEach(story -> classifier.classify(story.id(), story.title(), story.summary()));
    }

    @GetMapping
    public List<NewsStory> stories(@RequestParam(required = false) String q,
                                   @RequestParam(required = false) String category) {
        return java.util.stream.Stream.of(demoStories.stream(), collectedStories.values().stream(), userPublishedStories.values().stream())
            .flatMap(stream -> stream)
                .filter(story -> q == null || (story.title() + " " + story.summary()).toLowerCase().contains(q.toLowerCase()))
                .filter(story -> category == null || story.category().equalsIgnoreCase(category))
                .sorted((left, right) -> right.publishedAt().compareTo(left.publishedAt()))
                .toList();
    }

    @Scheduled(fixedDelayString = "${hub.news.refresh-ms:1800000}", initialDelay = 5000)
    public void refreshConfiguredFeeds() {
        for (String configuredUrl : configuredFeeds.split(",")) {
            String feedUrl = configuredUrl.trim();
            if (feedUrl.isEmpty()) continue;
            try {
                URI uri = URI.create(feedUrl);
                if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) continue;
                byte[] content = restClient.get().uri(uri).retrieve().body(byte[].class);
                if (content == null || content.length == 0 || content.length > 5_000_000) continue;
                for (NewsStory story : parseFeed(content, uri.getHost())) {
                    collectedStories.putIfAbsent(story.id(), story);
                }
            } catch (Exception ignored) {
                // One unavailable or malformed feed must not interrupt the other sources.
            }
        }
    }

    private List<NewsStory> parseFeed(byte[] content, String source) throws Exception {
        var factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        var document = factory.newDocumentBuilder().parse(new InputSource(new ByteArrayInputStream(content)));
        NodeList entries = document.getElementsByTagNameNS("*", "item");
        if (entries.getLength() == 0) entries = document.getElementsByTagNameNS("*", "entry");
        List<NewsStory> parsed = new ArrayList<>();
        for (int index = 0; index < entries.getLength() && index < 100; index++) {
            Node entry = entries.item(index);
            if (!(entry instanceof Element element)) continue;
            String title = firstText(element, "title");
            String summary = firstText(element, "description");
            if (summary.isBlank()) summary = firstText(element, "summary");
            if (title.isBlank() || summary.isBlank()) continue;
            String link = firstText(element, "link");
            if (link.isBlank()) link = title;
            String key = Integer.toHexString(link.hashCode());
            var classification = classifier.classify(key, title, summary);
            String image = firstMediaUrl(element);
            if (image.isBlank() || !image.startsWith("https://")) image = defaultImage(classification.category());
            parsed.add(new NewsStory("n-feed-" + key, clean(title), clean(summary), classification.category(), source,
                    image, Instant.now()));
        }
        return parsed;
    }

    private String firstText(Element element, String localName) {
        NodeList nodes = element.getElementsByTagNameNS("*", localName);
        if (nodes.getLength() == 0) return "";
        Node node = nodes.item(0);
        if ("link".equals(localName) && node instanceof Element link && link.hasAttribute("href")) return link.getAttribute("href");
        return node.getTextContent().trim();
    }

    private String firstMediaUrl(Element element) {
        for (String name : List.of("thumbnail", "content", "enclosure")) {
            NodeList nodes = element.getElementsByTagNameNS("*", name);
            for (int index = 0; index < nodes.getLength(); index++) {
                Node node = nodes.item(index);
                if (node instanceof Element media && media.hasAttribute("url")) {
                    String type = media.getAttribute("type");
                    if (type.isBlank() || type.startsWith("image/")) return media.getAttribute("url");
                }
            }
        }
        return "";
    }

    private String clean(String html) {
        return html.replaceAll("(?is)<(script|style)[^>]*>.*?</\\1>", " ")
                .replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    }

    private String defaultImage(String category) {
        Map<String, String> images = Map.of(
                "technology", "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=82",
                "sports", "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=82",
                "education", "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=900&q=82");
        return images.getOrDefault(category.toLowerCase(), "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=82");
    }

    @PostMapping("/classify")
    @PreAuthorize("hasAnyRole('STUDENT','EDITOR','ADMIN','SUPER_ADMIN')")
    public NewsClassificationService.ClassificationResult classify(@Valid @RequestBody ClassifyRequest request) {
        return classifier.classify("draft-" + java.util.UUID.randomUUID(), request.title(), request.body());
    }

    @GetMapping("/media/{filename:.+}")
    public ResponseEntity<Resource> publishedImage(@org.springframework.web.bind.annotation.PathVariable String filename) {
        if (!filename.matches("[a-f0-9-]+\\.(jpg|png|webp)")) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        String publicPath = "/api/news/media/" + filename;
        boolean referenced = userPublishedStories.values().stream().anyMatch(story -> story.image().equals(publicPath));
        Path imagePath = uploadDirectory.resolve(filename).normalize();
        if (!referenced || !imagePath.startsWith(uploadDirectory) || !Files.isRegularFile(imagePath)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        MediaType mediaType = filename.endsWith(".jpg") ? MediaType.IMAGE_JPEG
                : filename.endsWith(".png") ? MediaType.IMAGE_PNG : MediaType.parseMediaType("image/webp");
        return ResponseEntity.ok().contentType(mediaType).header("X-Content-Type-Options", "nosniff")
                .body(new FileSystemResource(imagePath));
    }

    @PostMapping(consumes = "multipart/form-data")
    @PreAuthorize("hasAnyRole('STUDENT','EDITOR','ADMIN','SUPER_ADMIN')")
    public NewsStory publish(@RequestParam @NotBlank @Size(max = 180) String title,
                             @RequestParam @NotBlank @Size(max = 1000) String summary,
                             @RequestParam @NotBlank @Size(max = 20000) String body,
                             @RequestParam @NotBlank @Size(max = 90) String source,
                             @RequestParam @NotBlank String category,
                             @RequestParam(required = false) @Size(max = 1000) String coverUrl,
                             @RequestParam(required = false) MultipartFile photo) throws IOException {
        if (!DAILY_CATEGORIES.contains(category)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a supported Daily News category.");
        String imageUrl = coverUrl == null ? "" : coverUrl.trim();
        if (photo != null && !photo.isEmpty()) {
            imageUrl = storeGeneratedPhoto(photo);
        } else if (!imageUrl.startsWith("https://")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A public HTTPS cover image is required.");
        }
        String id = "user-" + java.util.UUID.randomUUID();
        classifier.classify(id, title, body);
        NewsStory story = new NewsStory(id, title.trim(), summary.trim(), category, source.trim(), imageUrl, Instant.now());
        userPublishedStories.put(id, story);
        return story;
    }

    private String storeGeneratedPhoto(MultipartFile photo) throws IOException {
        if (photo.getSize() > 10L * 1024 * 1024) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Article photos must be 10 MB or smaller.");
        String contentType = photo.getContentType();
        if (contentType == null || !Set.of("image/jpeg", "image/png", "image/webp").contains(contentType.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Use a JPG, PNG or WebP article photo.");
        }
        byte[] signature;
        try (InputStream input = photo.getInputStream()) { signature = input.readNBytes(12); }
        boolean validSignature = switch (contentType.toLowerCase()) {
            case "image/jpeg" -> signature.length >= 3 && (signature[0] & 0xff) == 0xff && (signature[1] & 0xff) == 0xd8 && (signature[2] & 0xff) == 0xff;
            case "image/png" -> signature.length >= 8 && (signature[0] & 0xff) == 0x89 && signature[1] == 0x50 && signature[2] == 0x4e && signature[3] == 0x47;
            case "image/webp" -> signature.length >= 12 && new String(signature, 0, 4, java.nio.charset.StandardCharsets.US_ASCII).equals("RIFF") && new String(signature, 8, 4, java.nio.charset.StandardCharsets.US_ASCII).equals("WEBP");
            default -> false;
        };
        if (!validSignature) throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "The photo contents do not match the selected image type.");
        Files.createDirectories(uploadDirectory);
        String extension = switch (contentType.toLowerCase()) { case "image/jpeg" -> ".jpg"; case "image/png" -> ".png"; default -> ".webp"; };
        String filename = java.util.UUID.randomUUID() + extension;
        Path target = uploadDirectory.resolve(filename).normalize();
        if (!target.startsWith(uploadDirectory)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        photo.transferTo(target);
        return "/api/news/media/" + filename;
    }

    public record NewsStory(String id, String title, String summary, String category, String source, String image, Instant publishedAt) {}
    public record ClassifyRequest(@NotBlank @Size(max = 180) String title, @NotBlank @Size(max = 20000) String body) {}
}