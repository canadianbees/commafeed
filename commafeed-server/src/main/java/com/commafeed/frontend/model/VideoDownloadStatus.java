package com.commafeed.frontend.model;

import com.commafeed.backend.video.VideoDownloadService;
import com.commafeed.backend.video.YtDlpProgressParser;

import io.quarkus.runtime.annotations.RegisterForReflection;

import lombok.Data;

import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.io.Serializable;
import java.time.Instant;

@SuppressWarnings("serial")
@Schema(description = "Download status of the video of an entry")
@Data
@RegisterForReflection
public class VideoDownloadStatus implements Serializable {

    @Schema(description = "download status", required = true)
    private VideoDownloadService.Status status;

    @Schema(description = "error message if the download failed")
    private String error;

    @Schema(description = "what is being downloaded, while downloading")
    private YtDlpProgressParser.Stage stage;

    @Schema(description = "download progress of the current stage from 0 to 100, if known")
    private Double progress;

    @Schema(description = "download speed in bytes per second, if known")
    private Double speed;

    @Schema(description = "estimated remaining seconds for the current stage, if known")
    private Long eta;

    @Schema(description = "size of the downloaded video in bytes, once downloaded")
    private Long size;

    @Schema(description = "when the video was downloaded", type = SchemaType.INTEGER)
    private Instant downloadedAt;

    @Schema(
            description = "when the downloaded video will be deleted from the server",
            type = SchemaType.INTEGER)
    private Instant expiresAt;

    public static VideoDownloadStatus from(VideoDownloadService.VideoStatus status) {
        VideoDownloadStatus s = new VideoDownloadStatus();
        s.setStatus(status.status());
        s.setError(status.error());
        s.setSize(status.size());
        s.setDownloadedAt(status.downloadedAt());
        s.setExpiresAt(status.expiresAt());
        if (status.progress() != null) {
            s.setStage(status.progress().stage());
            s.setProgress(status.progress().percent());
            s.setSpeed(status.progress().speed());
            s.setEta(status.progress().eta());
        }
        return s;
    }
}
