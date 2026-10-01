package com.commafeed.backend.video;

import com.commafeed.CommaFeedConfiguration;
import com.commafeed.CommaFeedConfiguration.VideoDownload;
import com.commafeed.backend.video.YtDlpProgressParser.DownloadProgress;
import com.google.common.util.concurrent.MoreExecutors;

import jakarta.inject.Singleton;

import lombok.extern.slf4j.Slf4j;

import org.apache.commons.lang3.StringUtils;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

/** Downloads videos with yt-dlp into a cache directory, one file per video. */
@Slf4j
@Singleton
public class VideoDownloadService {

    public static final String VIDEO_EXTENSION = ".mp4";
    static final String PART_MARKER = ".part.";
    private static final int MAX_ERROR_LENGTH = 1000;
    private static final int MAX_OUTPUT_LINES = 50;
    private static final long OUTPUT_READER_JOIN_TIMEOUT_MS = 5000;

    private final VideoDownload config;
    private final Duration shutdownTimeout;
    private final Map<String, Job> jobs = new ConcurrentHashMap<>();
    private ExecutorService executor;

    public VideoDownloadService(CommaFeedConfiguration config) {
        this.config = config.videoDownload();
        this.shutdownTimeout = config.shutdownTimeout();
    }

    public boolean isEnabled() {
        return config.enabled();
    }

    public Path getCacheDirectory() {
        return Path.of(config.cacheDirectory());
    }

    public Path resolveFile(VideoSource video) {
        return getCacheDirectory().resolve(video.key() + VIDEO_EXTENSION);
    }

    public VideoStatus status(VideoSource video) {
        Path file = resolveFile(video);
        if (Files.isRegularFile(file)) {
            try {
                BasicFileAttributes attributes =
                        Files.readAttributes(file, BasicFileAttributes.class);
                Instant downloadedAt = attributes.lastModifiedTime().toInstant();
                return new VideoStatus(
                        Status.DONE,
                        null,
                        null,
                        attributes.size(),
                        downloadedAt,
                        downloadedAt.plus(config.retention()));
            } catch (IOException e) {
                // the file was deleted in the meantime
                log.debug("could not read attributes of {}", file, e);
            }
        }

        Job job = jobs.get(video.key());
        if (job == null) {
            return VideoStatus.of(Status.NONE, null, null);
        }
        return VideoStatus.of(
                job.status, job.error, job.status == Status.DOWNLOADING ? job.progress : null);
    }

    /** Queues a download for the video if it's not downloaded or being downloaded already. */
    public VideoStatus request(VideoSource video) {
        VideoStatus current = status(video);
        if (current.status() == Status.DONE) {
            return current;
        }

        // replace failed jobs so that the user can retry
        jobs.compute(
                video.key(),
                (key, existing) -> {
                    if (existing != null && existing.status != Status.FAILED) {
                        return existing;
                    }
                    Job job = new Job();
                    getExecutor().submit(() -> download(video, job));
                    return job;
                });
        return status(video);
    }

    private synchronized ExecutorService getExecutor() {
        if (executor == null) {
            executor = Executors.newFixedThreadPool(config.maxConcurrentDownloads());
        }
        return executor;
    }

    public synchronized void stop() {
        if (executor != null) {
            MoreExecutors.shutdownAndAwaitTermination(executor, shutdownTimeout);
            executor = null;
        }
    }

    private void download(VideoSource video, Job job) {
        String key = video.key();
        job.status = Status.DOWNLOADING;
        Deque<String> lastLines = new ArrayDeque<>();
        try {
            Files.createDirectories(getCacheDirectory());

            Process process =
                    new ProcessBuilder(buildCommand(video)).redirectErrorStream(true).start();

            // read the output while the process runs to track progress and keep the last lines
            // for error messages
            Thread reader = Thread.ofVirtual().start(() -> readOutput(process, job, lastLines));

            boolean finished =
                    process.waitFor(config.downloadTimeout().toMillis(), TimeUnit.MILLISECONDS);
            if (!finished) {
                process.destroyForcibly();
                reader.join(OUTPUT_READER_JOIN_TIMEOUT_MS);
                fail(job, key, "download timed out after " + config.downloadTimeout());
                return;
            }
            reader.join(OUTPUT_READER_JOIN_TIMEOUT_MS);

            if (process.exitValue() != 0) {
                fail(job, key, errorMessage(lastLines));
                return;
            }

            Optional<Path> output = findPartFile(key);
            if (output.isEmpty()) {
                fail(job, key, "yt-dlp did not produce a video file");
                return;
            }

            Files.move(
                    output.get(),
                    resolveFile(video),
                    StandardCopyOption.REPLACE_EXISTING,
                    StandardCopyOption.ATOMIC_MOVE);
            job.status = Status.DONE;
            jobs.remove(key, job);
            log.info("downloaded video {}", key);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            fail(job, key, "download interrupted");
        } catch (Exception e) {
            fail(job, key, e.getMessage());
        } finally {
            deletePartFiles(key);
        }
    }

    private static void readOutput(Process process, Job job, Deque<String> lastLines) {
        try (BufferedReader reader =
                new BufferedReader(
                        new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                Optional<DownloadProgress> progress = YtDlpProgressParser.parse(line);
                if (progress.isPresent()) {
                    job.progress = progress.get();
                    continue;
                }

                synchronized (lastLines) {
                    lastLines.addLast(line);
                    if (lastLines.size() > MAX_OUTPUT_LINES) {
                        lastLines.removeFirst();
                    }
                }
            }
        } catch (IOException e) {
            // the stream is closed when the process is destroyed
            log.debug("stopped reading yt-dlp output", e);
        }
    }

    List<String> buildCommand(VideoSource video) {
        String output =
                getCacheDirectory().resolve(video.key() + PART_MARKER + "%(ext)s").toString();
        String format =
                switch (video.site()) {
                    case YOUTUBE -> config.youtubeFormat();
                    case TIKTOK -> config.tiktokFormat();
                };
        return List.of(
                config.ytDlpPath(),
                "--no-playlist",
                "--newline",
                "--progress",
                "--progress-template",
                YtDlpProgressParser.PROGRESS_TEMPLATE,
                "--no-continue",
                "-f",
                format,
                "--merge-output-format",
                "mp4",
                "-o",
                output,
                video.url());
    }

    private Optional<Path> findPartFile(String key) throws IOException {
        try (Stream<Path> files = Files.list(getCacheDirectory())) {
            return files.filter(p -> p.getFileName().toString().equals(key + PART_MARKER + "mp4"))
                    .findFirst();
        }
    }

    private void deletePartFiles(String key) {
        try (Stream<Path> files = Files.list(getCacheDirectory())) {
            files.filter(p -> p.getFileName().toString().startsWith(key + PART_MARKER))
                    .forEach(
                            p -> {
                                try {
                                    Files.deleteIfExists(p);
                                } catch (IOException e) {
                                    log.warn("could not delete {}", p, e);
                                }
                            });
        } catch (IOException e) {
            log.warn("could not list {}", getCacheDirectory(), e);
        }
    }

    private void fail(Job job, String key, String error) {
        log.warn("could not download video {}: {}", key, error);
        job.error =
                StringUtils.abbreviate(
                        StringUtils.defaultIfBlank(error, "unknown error"), MAX_ERROR_LENGTH);
        job.status = Status.FAILED;
    }

    private static String errorMessage(Deque<String> lastLines) {
        List<String> lines;
        synchronized (lastLines) {
            lines = List.copyOf(lastLines);
        }
        // yt-dlp prints the actual error on the last lines
        List<String> errors = lines.stream().filter(l -> l.startsWith("ERROR")).toList();
        List<String> source = errors.isEmpty() ? lines : errors;
        return String.join("\n", source.subList(Math.max(0, source.size() - 5), source.size()));
    }

    public enum Status {
        NONE,
        QUEUED,
        DOWNLOADING,
        DONE,
        FAILED
    }

    /**
     * @param size size of the downloaded file in bytes, when downloaded
     * @param downloadedAt when the video was downloaded
     * @param expiresAt when the downloaded video will be deleted from the cache
     */
    public record VideoStatus(
            Status status,
            String error,
            DownloadProgress progress,
            Long size,
            Instant downloadedAt,
            Instant expiresAt) {
        static VideoStatus of(Status status, String error, DownloadProgress progress) {
            return new VideoStatus(status, error, progress, null, null, null);
        }
    }

    private static class Job {
        private volatile Status status = Status.QUEUED;
        private volatile String error;
        private volatile DownloadProgress progress;
    }
}
