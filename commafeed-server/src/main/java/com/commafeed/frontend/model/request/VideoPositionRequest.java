package com.commafeed.frontend.model.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.PositiveOrZero;

import lombok.Data;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.io.Serializable;

@SuppressWarnings("serial")
@Schema(description = "Where the user stopped watching a video")
@Data
public class VideoPositionRequest implements Serializable {

    @Schema(
            description =
                    "position in seconds, null to clear it (e.g. the video was watched until the end)")
    @PositiveOrZero
    @Max(10_000_000)
    private Double position;
}
