package com.kietnewshub.news;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class PredicateTagger {
    private static final Map<String, List<String>> RULES = Map.ofEntries(
            Map.entry("Technology", List.of("software", "technology", "startup", "digital", "cyber")),
            Map.entry("AI", List.of("artificial intelligence", "machine learning", "llm", "ai model")),
            Map.entry("Education", List.of("student", "college", "university", "campus", "education")),
            Map.entry("Jobs", List.of("hiring", "recruitment", "placement", "job opening", "career")),
            Map.entry("Sports", List.of("match", "tournament", "team", "championship", "sports")),
            Map.entry("Business", List.of("market", "company", "investment", "business", "economy")),
            Map.entry("Science", List.of("research", "scientist", "experiment", "climate", "discovery")),
            Map.entry("Hyderabad", List.of("hyderabad", "telangana", "ghaziabad", "kiet")));

    public List<String> tag(String text) {
        String normalized = text.toLowerCase(Locale.ROOT);
        var matches = new LinkedHashSet<String>();
        RULES.forEach((category, predicates) -> {
            if (predicates.stream().anyMatch(normalized::contains)) matches.add(category);
        });
        return List.copyOf(matches);
    }
}