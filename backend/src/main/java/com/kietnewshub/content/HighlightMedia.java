package com.kietnewshub.content;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "highlight_media")
public class HighlightMedia {
    @Id
    private Long id;

    @Column(nullable = false, length = 30)
    private String contentType;

    @Column(nullable = false, columnDefinition = "bytea")
    private byte[] data;

    protected HighlightMedia() {}

    public HighlightMedia(Long id, String contentType, byte[] data) {
        this.id = id;
        this.contentType = contentType;
        this.data = data;
    }

    public Long getId() { return id; }
    public String getContentType() { return contentType; }
    public byte[] getData() { return data; }
}