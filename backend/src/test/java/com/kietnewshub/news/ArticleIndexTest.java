package com.kietnewshub.news;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class ArticleIndexTest {
    @Test
    void avlIndexHandlesSortedInsertionsAndCaseInsensitiveLookup() {
        ArticleAvlIndex index = new ArticleAvlIndex();
        for (int number = 0; number < 1_000; number++) {
            index.put(String.format("story %04d", number), "id-" + number);
        }

        assertEquals("id-0", index.find("STORY 0000"));
        assertEquals("id-999", index.find("story 0999"));
        assertNull(index.find("missing story"));
    }

    @Test
    void predicateTagsCanBeCombined() {
        List<String> tags = new PredicateTagger().tag("KIET students present an artificial intelligence research project in Hyderabad");

        assertTrue(tags.containsAll(List.of("AI", "Education", "Hyderabad")));
    }
}