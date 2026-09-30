package com.kietnewshub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class KietNewsHubApplication {
    public static void main(String[] args) {
        SpringApplication.run(KietNewsHubApplication.class, args);
    }
}