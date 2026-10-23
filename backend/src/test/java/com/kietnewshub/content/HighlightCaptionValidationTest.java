package com.kietnewshub.content;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class HighlightCaptionValidationTest {
    @Test
    void normalizeCaptionTrimsAndSanitizesUnsafeCharacters() {
        String cleaned = HighlightController.normalizeCaption("  Amazing campus day\u0001 #KIET  \n\twith friends!  ");
        assertEquals("Amazing campus day #KIET with friends!", cleaned);
    }

    @Test
    void normalizeCaptionCapsLengthAtFiveHundredCharacters() {
        String value = "A".repeat(600);
        assertEquals(500, HighlightController.normalizeCaption(value).length());
    }

    @Test
    void resolveContentTypeDetectsExtensionWhenHeaderIsMissingOrGeneric() {
        org.springframework.mock.web.MockMultipartFile fileJpg = new org.springframework.mock.web.MockMultipartFile("media", "photo.JPG", "application/octet-stream", new byte[]{1, 2, 3});
        assertEquals("image/jpeg", HighlightController.resolveContentType(fileJpg));

        org.springframework.mock.web.MockMultipartFile fileMp4 = new org.springframework.mock.web.MockMultipartFile("media", "clip.mp4", "", new byte[]{1, 2, 3});
        assertEquals("video/mp4", HighlightController.resolveContentType(fileMp4));

        org.springframework.mock.web.MockMultipartFile explicit = new org.springframework.mock.web.MockMultipartFile("media", "pic.png", "image/png", new byte[]{1, 2, 3});
        assertEquals("image/png", HighlightController.resolveContentType(explicit));
    }
}
