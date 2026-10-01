package com.commafeed.frontend.model;

import com.commafeed.backend.video.VideoInfoService;

import io.quarkus.runtime.annotations.RegisterForReflection;

import lombok.Data;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.io.Serializable;
import java.util.List;

@SuppressWarnings("serial")
@Schema(description = "Details of the video of an entry, read from the video site")
@Data
@RegisterForReflection
public class VideoInfoResponse implements Serializable {

    @Schema(description = "full description of the video, plain text")
    private String description;

    @Schema(description = "length of the video in seconds")
    private Double duration;

    @Schema(description = "chapters of the video", required = true)
    private List<VideoChapter> chapters;

    public static VideoInfoResponse from(VideoInfoService.VideoInfo info) {
        VideoInfoResponse r = new VideoInfoResponse();
        r.setDescription(info.description());
        r.setDuration(info.duration());
        r.setChapters(
                info.chapters().stream()
                        .map(c -> new VideoChapter(c.startTime(), c.title()))
                        .toList());
        return r;
    }

    /** A chapter of a video, starting at the given number of seconds. */
    @Schema(description = "Chapter of a video")
    @RegisterForReflection
    public record VideoChapter(
            @Schema(description = "start of the chapter in seconds", required = true)
                    double startTime,
            @Schema(description = "title of the chapter", required = true) String title)
            implements Serializable {}
}
