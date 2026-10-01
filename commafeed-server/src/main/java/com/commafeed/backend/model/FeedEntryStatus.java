package com.commafeed.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "FEEDENTRYSTATUSES")
@SuppressWarnings("serial")
@Getter
@Setter
public class FeedEntryStatus extends AbstractModel {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private FeedSubscription subscription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private FeedEntry entry;

    @Column(name = "read_status")
    private boolean read;

    private boolean starred;

    /**
     * where the user stopped watching the video of the entry, in seconds. null if not started or
     * finished
     */
    @Column(name = "video_position")
    private Double videoPosition;

    @Transient private boolean markable;

    @Transient private List<FeedEntryTag> tags = new ArrayList<>();

    /** Denormalization starts here */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private User user;

    @Column private Instant entryInserted;

    @Column(name = "entryUpdated")
    private Instant entryPublished;

    public FeedEntryStatus() {}

    public FeedEntryStatus(User user, FeedSubscription subscription, FeedEntry entry) {
        this.user = user;
        this.subscription = subscription;
        this.entry = entry;
        this.entryInserted = entry.getInserted();
        this.entryPublished = entry.getPublished();
    }
}
