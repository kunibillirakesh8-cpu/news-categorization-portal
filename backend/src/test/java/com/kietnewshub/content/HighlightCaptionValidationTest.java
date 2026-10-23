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
}
