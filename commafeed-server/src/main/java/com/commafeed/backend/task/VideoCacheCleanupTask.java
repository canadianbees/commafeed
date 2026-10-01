package com.commafeed.backend.task;

import com.commafeed.CommaFeedConfiguration;
import com.commafeed.backend.video.VideoDownloadService;
import com.commafeed.backend.video.VideoInfoService;

import io.quarkus.runtime.configuration.MemorySize;

import jakarta.inject.Singleton;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

/** Deletes downloaded videos that are too old, or the oldest when the cache is too big. */
@Slf4j
@RequiredArgsConstructor
@Singleton
public class VideoCacheCleanupTask extends ScheduledTask {

    private final CommaFeedConfiguration config;
    private final VideoDownloadService videoDownloadService;

    @Override
    public void run() {
        Path dir = videoDownloadService.getCacheDirectory();
        if (!Files.isDirectory(dir)) {
            return;
        }

        Instant expiration = Instant.now().minus(config.videoDownload().retention());
        List<CachedFile> kept = new ArrayList<>();
        for (CachedFile file : listFiles(dir, VideoDownloadService.VIDEO_EXTENSION)) {
            if (file.lastModified().isBefore(expiration)) {
                delete(file.path());
            } else {
                kept.add(file);
            }
        }

        // video details are small, they are only removed when they get old
        for (CachedFile file : listFiles(dir, VideoInfoService.INFO_EXTENSION)) {
            if (file.lastModified().isBefore(expiration)) {
                delete(file.path());
            }
        }

        long maxSize =
                config.videoDownload().maxCacheSize().map(MemorySize::asLongValue).orElse(-1L);
        if (maxSize < 0) {
            return;
        }

        long total = kept.stream().mapToLong(CachedFile::size).sum();
        kept.sort(Comparator.comparing(CachedFile::lastModified));
        for (CachedFile file : kept) {
            if (total <= maxSize) {
                break;
            }
            delete(file.path());
            total -= file.size();
        }
    }

    private List<CachedFile> listFiles(Path dir, String extension) {
        try (Stream<Path> files = Files.list(dir)) {
            return files.filter(p -> p.getFileName().toString().endsWith(extension))
                    .map(VideoCacheCleanupTask::toCachedFile)
                    .toList();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static CachedFile toCachedFile(Path path) {
        try {
            BasicFileAttributes attrs = Files.readAttributes(path, BasicFileAttributes.class);
            return new CachedFile(path, attrs.lastModifiedTime().toInstant(), attrs.size());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static void delete(Path path) {
        try {
            Files.deleteIfExists(path);
            log.info("deleted cached video {}", path.getFileName());
        } catch (IOException e) {
            log.warn("could not delete {}", path, e);
        }
    }

    @Override
    public long getInitialDelay() {
        return 10;
    }

    @Override
    public long getPeriod() {
        return 60;
    }

    @Override
    public TimeUnit getTimeUnit() {
        return TimeUnit.MINUTES;
    }

    private record CachedFile(Path path, Instant lastModified, long size) {}
}
