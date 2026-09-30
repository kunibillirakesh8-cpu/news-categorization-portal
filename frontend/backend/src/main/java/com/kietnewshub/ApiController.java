package com.kietnewshub;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ApiController {
    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "ok", "service", "kiet-news-hub-api");
    }
}