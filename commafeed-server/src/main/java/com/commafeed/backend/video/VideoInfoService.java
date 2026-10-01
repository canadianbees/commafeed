package com.commafeed.backend.video;

import com.commafeed.CommaFeedConfiguration;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.quarkus.runtime.annotations.RegisterForReflection;

import jakarta.inject.Singleton;

import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Details of a video that the feed usually doesn't have: its full description, duration and
 * chapters. They are read with yt-dlp without downloading the video, then cached next to the
 * downloaded videos.
 */
@Slf4j
@Singleton
public class VideoInfoService {

    public static final String INFO_EXTENSION = ".info.json";
    private static final Duration INFO_TIMEOUT = Duration.ofSeconds(60);

    private final CommaFeedConfiguration.VideoDownload config;
    private final VideoDownloadService videoDownloadService;
    private final ObjectMapper objectMapper;
    private final Map<String, CompletableFuture<Optional<VideoInfo>>> inProgress =
            new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public VideoInfoService(
            CommaFeedConfiguration config,
            VideoDownloadService videoDownloadService,
            ObjectMapper objectMapper) {
        this.config = config.videoDownload();
        this.videoDownloadService = videoDownloadService;
        this.objectMapper = objectMapper;
    }

    Path resolveInfoFile(VideoSource video) {
        return videoDownloadService.getCacheDirectory().resolve(video.key() + INFO_EXTENSION);
    }

    /** Returns the details of the video, reading them with yt-dlp the first time. */
    public Optional<VideoInfo> info(VideoSource video) {
        Optional<VideoInfo> cached = readCache(video);
        if (cached.isPresent()) {
            return cached;
        }

        // several requests for the same video share a single yt-dlp call
        CompletableFuture<Optional<VideoInfo>> future =
                inProgress.computeIfAbsent(
                        video.key(),
                        key -> CompletableFuture.supplyAsync(() -> fetch(video), executor));
        try {
            return future.get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (ExecutionException e) {
            log.warn("could not read info of video {}", video.key(), e);
            return Optional.empty();
        } finally {
            inProgress.remove(video.key(), future);
        }
    }

    private Optional<VideoInfo> readCache(VideoSource video) {
        Path file = resolveInfoFile(video);
        if (!Files.isRegularFile(file)) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readValue(file.toFile(), VideoInfo.class));
        } catch (IOException e) {
            log.warn("could not read cached info of video {}", video.key(), e);
            return Optional.empty();
        }
    }

    private Optional<VideoInfo> fetch(VideoSource video) {
        Path output = null;
        try {
            Files.createDirectories(videoDownloadService.getCacheDirectory());
            output = Files.createTempFile("yt-dlp-info-" + video.key(), ".json");

            Process process =
                    new ProcessBuilder(buildCommand(video))
                            .redirectOutput(output.toFile())
                            .redirectError(ProcessBuilder.Redirect.DISCARD)
                            .start();
            if (!process.waitFor(INFO_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS)) {
                process.destroyForcibly();
                log.warn("reading info of video {} timed out", video.key());
                return Optional.empty();
            }
            if (process.exitValue() != 0) {
                log.warn("could not read info of video {}", video.key());
                return Optional.empty();
            }

            VideoInfo info = parse(objectMapper.readTree(output.toFile()));
            objectMapper.writeValue(resolveInfoFile(video).toFile(), info);
            return Optional.of(info);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (IOException e) {
            log.warn("could not read info of video {}", video.key(), e);
            return Optional.empty();
        } finally {
            if (output != null) {
                try {
                    Files.deleteIfExists(output);
                } catch (IOException e) {
                    // ignore
                }
            }
        }
    }

    List<String> buildCommand(VideoSource video) {
        return List.of(
                config.ytDlpPath(),
                "--no-playlist",
                "--skip-download",
                "--dump-single-json",
                "--no-warnings",
                video.url());
    }

    static VideoInfo parse(JsonNode root) {
        String description = root.path("description").asText(null);
        Double duration =
                root.path("duration").isNumber() ? root.path("duration").asDouble() : null;

        List<Chapter> chapters = new ArrayList<>();
        for (JsonNode chapter : root.path("chapters")) {
            if (chapter.path("start_time").isNumber()) {
                chapters.add(
                        new Chapter(
                                chapter.path("start_time").asDouble(),
                                chapter.path("title").asText("")));
            }
        }
        return new VideoInfo(description, duration, chapters);
    }

    /**
     * @param description the full description of the video, plain text
     * @param duration length of the video in seconds, if known
     * @param chapters chapters of the video, empty if it has none
     */
    @RegisterForReflection
    public record VideoInfo(String description, Double duration, List<Chapter> chapters) {}

    /**
     * @param startTime start of the chapter, in seconds from the beginning of the video
     * @param title title of the chapter
     */
    @RegisterForReflection
    public record Chapter(double startTime, String title) {}
}
