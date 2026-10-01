package com.commafeed.backend.task;

import com.commafeed.CommaFeedConfiguration;
import com.commafeed.backend.video.VideoDownloadService;
import com.commafeed.backend.video.VideoInfoService;

import io.quarkus.runtime.configuration.MemorySize;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

class VideoCacheCleanupTaskTest {

    @TempDir private Path cacheDir;

    private CommaFeedConfiguration.VideoDownload videoConfig;
    private VideoCacheCleanupTask task;

    @BeforeEach
    void init() {
        videoConfig = Mockito.mock(CommaFeedConfiguration.VideoDownload.class);
        Mockito.when(videoConfig.retention()).thenReturn(Duration.ofDays(30));
        Mockito.when(videoConfig.maxCacheSize()).thenReturn(Optional.empty());

        CommaFeedConfiguration config = Mockito.mock(CommaFeedConfiguration.class);
        Mockito.when(config.videoDownload()).thenReturn(videoConfig);

        VideoDownloadService service = Mockito.mock(VideoDownloadService.class);
        Mockito.when(service.getCacheDirectory()).thenReturn(cacheDir);

        task = new VideoCacheCleanupTask(config, service);
    }

    @Test
    void deletesExpiredVideos() throws Exception {
        Path old = video("old00000000", 10, Duration.ofDays(31));
        Path recent = video("new00000000", 10, Duration.ofDays(1));

        task.run();

        Assertions.assertFalse(Files.exists(old));
        Assertions.assertTrue(Files.exists(recent));
    }

    @Test
    void deletesOldestVideosWhenCacheIsTooBig() throws Exception {
        Mockito.when(videoConfig.maxCacheSize()).thenReturn(Optional.of(MemorySize.of(25L)));
        Path oldest = video("aaaaaaaaaaa", 10, Duration.ofDays(3));
        Path middle = video("bbbbbbbbbbb", 10, Duration.ofDays(2));
        Path newest = video("ccccccccccc", 10, Duration.ofDays(1));

        task.run();

        Assertions.assertFalse(Files.exists(oldest));
        Assertions.assertTrue(Files.exists(middle));
        Assertions.assertTrue(Files.exists(newest));
    }

    @Test
    void deletesExpiredVideoDetails() throws Exception {
        Path old = cacheDir.resolve("youtube-old00000000" + VideoInfoService.INFO_EXTENSION);
        Path recent = cacheDir.resolve("youtube-new00000000" + VideoInfoService.INFO_EXTENSION);
        for (Path file : List.of(old, recent)) {
            Files.writeString(file, "{}");
        }
        Files.setLastModifiedTime(old, FileTime.from(Instant.now().minus(Duration.ofDays(31))));

        task.run();

        Assertions.assertFalse(Files.exists(old));
        Assertions.assertTrue(Files.exists(recent));
    }

    @Test
    void ignoresOtherFiles() throws Exception {
        Path other = cacheDir.resolve("notes.txt");
        Files.writeString(other, "keep me");
        Files.setLastModifiedTime(other, FileTime.from(Instant.now().minus(Duration.ofDays(365))));

        task.run();

        Assertions.assertTrue(Files.exists(other));
    }

    private Path video(String id, int size, Duration age) throws Exception {
        Path file = cacheDir.resolve(id + VideoDownloadService.VIDEO_EXTENSION);
        Files.write(file, new byte[size]);
        Files.setLastModifiedTime(file, FileTime.from(Instant.now().minus(age)));
        return file;
    }
}
