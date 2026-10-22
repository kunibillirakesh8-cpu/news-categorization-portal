package com.kietnewshub.news;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class NewsClassificationService {
    private final PredicateTagger predicateTagger = new PredicateTagger();
    private final ArticleAvlIndex articleIndex = new ArticleAvlIndex();
    private final RestClient mlClient;

    public NewsClassificationService(RestClient.Builder builder,
                                     @Value("${hub.ml.url:http://localhost:8000}") String mlUrl,
                                     @Value("${hub.ml.api-key:}") String apiKey) {
        this.mlClient = builder.baseUrl(mlUrl).defaultHeader("X-API-Key", apiKey).build();
    }

    public ClassificationResult classify(String articleId, String title, String body) {
        List<String> ruleTags = predicateTagger.tag(title + " " + body);
        articleIndex.put(title, articleId);
        try {
            MlResponse result = mlClient.post().uri("/classify")
                    .body(Map.of("text", title + " " + body, "rule_tags", ruleTags))
                    .retrieve().body(MlResponse.class);
            if (result != null) return new ClassificationResult(articleId, result.category(), ruleTags, "python-tfidf");
        } catch (RestClientException ignored) {
            // Java predicate tags remain available while the optional ML service is offline.
        }
        String category = ruleTags.isEmpty() ? "India" : ruleTags.get(0);
        return new ClassificationResult(articleId, category, ruleTags, "java-predicate-fallback");
    }

    public String indexedArticleId(String title) {
        return articleIndex.find(title);
    }

    public record ClassificationResult(String articleId, String category, List<String> tags, String classifier) {}
    private record MlResponse(String category, double confidence) {}
}