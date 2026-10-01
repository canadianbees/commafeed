package com.commafeed.backend.video;

import lombok.experimental.UtilityClass;

import java.util.Optional;

/** Parses the progress lines yt-dlp prints with {@link #PROGRESS_TEMPLATE}. */
@UtilityClass
public class YtDlpProgressParser {

    private static final String PREFIX = "CFPROGRESS|";

    /** Value of yt-dlp's --progress-template option, fields are separated by '|'. */
    public static final String PROGRESS_TEMPLATE =
            "download:"
                    + PREFIX
                    + "%(info.vcodec)s|%(progress.downloaded_bytes)s|%(progress.total_bytes)s"
                    + "|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s";

    public static Optional<DownloadProgress> parse(String line) {
        if (line == null) {
            return Optional.empty();
        }

        if (line.startsWith("[Merger]")) {
            return Optional.of(new DownloadProgress(Stage.MERGING, null, null, null));
        }

        if (!line.startsWith(PREFIX)) {
            return Optional.empty();
        }

        String[] fields = line.substring(PREFIX.length()).split("\\|", -1);
        if (fields.length != 6) {
            return Optional.empty();
        }

        // yt-dlp sets vcodec to "none" for audio-only formats
        Stage stage = "none".equals(fields[0]) ? Stage.AUDIO : Stage.VIDEO;
        Double downloaded = number(fields[1]);
        Double total = number(fields[2]);
        if (total == null) {
            total = number(fields[3]);
        }

        Double percent = null;
        if (downloaded != null && total != null && total > 0) {
            percent = Math.min(100, downloaded * 100 / total);
        }

        Double eta = number(fields[5]);
        return Optional.of(
                new DownloadProgress(
                        stage, percent, number(fields[4]), eta == null ? null : Math.round(eta)));
    }

    private static Double number(String value) {
        try {
            double d = Double.parseDouble(value);
            return Double.isFinite(d) && d >= 0 ? d : null;
        } catch (NumberFormatException e) {
            // yt-dlp prints "NA" for unknown values
            return null;
        }
    }

    public enum Stage {
        /** Downloading the video stream, or a single file containing both video and audio. */
        VIDEO,
        /** Downloading the audio stream, when video and audio are downloaded separately. */
        AUDIO,
        /** Merging the video and audio streams with ffmpeg. */
        MERGING
    }

    /**
     * @param percent 0 to 100, null if the size of the stream is unknown
     * @param speed bytes per second, null if unknown
     * @param eta seconds remaining for the current stream, null if unknown
     */
    public record DownloadProgress(Stage stage, Double percent, Double speed, Long eta) {}
}
