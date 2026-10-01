package com.commafeed.backend.video;

import com.commafeed.CommaFeedConfiguration;
import com.commafeed.backend.video.VideoDownloadService.Status;
import com.commafeed.backend.video.VideoDownloadService.VideoStatus;
import com.commafeed.backend.video.VideoSource.Site;
import com.commafeed.backend.video.YtDlpProgressParser.Stage;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;

// the tests run a fake yt-dlp written as a shell script, which Windows can't execute
@DisabledOnOs(value = OS.WINDOWS, disabledReason = "fake yt-dlp is a shell script")
class VideoDownloadServiceTest {

    private static final String FAKE_YT_DLP = "src/test/resources/video/fake-yt-dlp.sh";

    @TempDir private Path cacheDir;

    private CommaFeedConfiguration.VideoDownload videoConfig;
    private VideoDownloadService service;

    @BeforeEach
    void init() {
        videoConfig = Mockito.mock(CommaFeedConfiguration.VideoDownload.class);
        Mockito.when(videoConfig.enabled()).thenReturn(true);
        Mockito.when(videoConfig.ytDlpPath())
                .thenReturn(Path.of(FAKE_YT_DLP).toAbsolutePath().toString());
        Mockito.when(videoConfig.cacheDirectory()).thenReturn(cacheDir.toString());
        Mockito.when(videoConfig.youtubeFormat()).thenReturn("youtube-format");
        Mockito.when(videoConfig.tiktokFormat()).thenReturn("tiktok-format");
        Mockito.when(videoConfig.maxConcurrentDownloads()).thenReturn(2);
        Mockito.when(videoConfig.downloadTimeout()).thenReturn(Duration.ofSeconds(10));
        Mockito.when(videoConfig.retention()).thenReturn(Duration.ofDays(30));

        CommaFeedConfiguration config = Mockito.mock(CommaFeedConfiguration.class);
        Mockito.when(config.videoDownload()).thenReturn(videoConfig);
        Mockito.when(config.shutdownTimeout()).thenReturn(Duration.ofMillis(100));

        service = new VideoDownloadService(config);
    }

    @AfterEach
    void cleanup() {
        service.stop();
    }

    @Test
    void statusIsNoneWhenNothingRequested() {
        Assertions.assertEquals(Status.NONE, service.status(youtube("vid00000001")).status());
    }

    @Test
    void downloadsVideo() throws Exception {
        service.request(youtube("vid00000001"));

        awaitStatus(youtube("vid00000001"), Status.DONE);
        Path file = service.resolveFile(youtube("vid00000001"));
        Assertions.assertEquals("0123456789", Files.readString(file));

        VideoStatus status = service.status(youtube("vid00000001"));
        Assertions.assertEquals(10L, status.size());
        Assertions.assertNotNull(status.downloadedAt());
        Assertions.assertEquals(
                status.downloadedAt().plus(Duration.ofDays(30)), status.expiresAt());
        try (var files = Files.list(cacheDir)) {
            Assertions.assertEquals(List.of(file), files.toList(), "no leftover part files");
        }
    }

    @Test
    void existingFileIsDone() throws Exception {
        Files.writeString(service.resolveFile(youtube("vid00000001")), "video");
        Assertions.assertEquals(Status.DONE, service.request(youtube("vid00000001")).status());
    }

    @Test
    void reportsYtDlpError() {
        service.request(youtube("fail0000000"));

        awaitStatus(youtube("fail0000000"), Status.FAILED);
        Assertions.assertEquals(
                "ERROR: [youtube] Private video", service.status(youtube("fail0000000")).error());
        Assertions.assertFalse(Files.exists(service.resolveFile(youtube("fail0000000"))));
    }

    @Test
    void failedDownloadCanBeRetried() {
        service.request(youtube("fail0000000"));
        awaitStatus(youtube("fail0000000"), Status.FAILED);

        Status status = service.request(youtube("fail0000000")).status();
        Assertions.assertTrue(
                status == Status.QUEUED || status == Status.DOWNLOADING || status == Status.FAILED);
    }

    @Test
    void timesOut() {
        Mockito.when(videoConfig.downloadTimeout()).thenReturn(Duration.ofMillis(500));
        service.request(youtube("slow0000000"));

        awaitStatus(youtube("slow0000000"), Status.FAILED);
        Assertions.assertTrue(service.status(youtube("slow0000000")).error().contains("timed out"));
    }

    @Test
    void requestIsIdempotentWhileDownloading() {
        Mockito.when(videoConfig.downloadTimeout()).thenReturn(Duration.ofSeconds(2));
        service.request(youtube("slow0000000"));
        Status second = service.request(youtube("slow0000000")).status();

        Assertions.assertTrue(second == Status.QUEUED || second == Status.DOWNLOADING);
        awaitStatus(youtube("slow0000000"), Status.FAILED);
    }

    @Test
    void reportsProgressWhileDownloading() {
        Mockito.when(videoConfig.downloadTimeout()).thenReturn(Duration.ofSeconds(3));
        service.request(youtube("prog0000000"));

        Awaitility.await()
                .atMost(Duration.ofSeconds(10))
                .until(() -> service.status(youtube("prog0000000")).progress() != null);
        VideoStatus status = service.status(youtube("prog0000000"));
        Assertions.assertEquals(Status.DOWNLOADING, status.status());
        Assertions.assertEquals(Stage.VIDEO, status.progress().stage());
        Assertions.assertEquals(50.0, status.progress().percent());
        Assertions.assertEquals(12L, status.progress().eta());

        awaitStatus(youtube("prog0000000"), Status.FAILED);
        Assertions.assertNull(service.status(youtube("prog0000000")).progress());
    }

    @Test
    void progressLinesAreNotPartOfErrors() {
        service.request(youtube("fail0000000"));
        awaitStatus(youtube("fail0000000"), Status.FAILED);
        Assertions.assertFalse(
                service.status(youtube("fail0000000")).error().contains("CFPROGRESS"));
    }

    @Test
    void downloadsTiktokVideo() throws Exception {
        VideoSource video =
                new VideoSource(
                        Site.TIKTOK,
                        "7234567890123456789",
                        "https://www.tiktok.com/@user/video/7234567890123456789");
        service.request(video);

        awaitStatus(video, Status.DONE);
        Path file = service.resolveFile(video);
        Assertions.assertEquals("tiktok-7234567890123456789.mp4", file.getFileName().toString());
        Assertions.assertEquals("0123456789", Files.readString(file));
    }

    @Test
    void sameIdOnDifferentSitesAreDifferentFiles() {
        Assertions.assertNotEquals(
                service.resolveFile(youtube("12345678901")),
                service.resolveFile(new VideoSource(Site.TIKTOK, "12345678901", "https://x")));
    }

    @Test
    void usesFormatOfTheSite() {
        List<String> youtube = service.buildCommand(youtube("vid00000001"));
        Assertions.assertEquals("youtube-format", youtube.get(youtube.indexOf("-f") + 1));

        List<String> tiktok =
                service.buildCommand(
                        new VideoSource(
                                Site.TIKTOK,
                                "7234567890123456789",
                                "https://www.tiktok.com/@user/video/7234567890123456789"));
        Assertions.assertEquals("tiktok-format", tiktok.get(tiktok.indexOf("-f") + 1));
        Assertions.assertEquals(
                "https://www.tiktok.com/@user/video/7234567890123456789", tiktok.getLast());
    }

    @Test
    void passesVideoIdAsSingleArgument() {
        List<String> command = service.buildCommand(youtube("vid00000001"));
        Assertions.assertEquals("https://www.youtube.com/watch?v=vid00000001", command.getLast());
        Assertions.assertTrue(command.contains("--no-playlist"));
        Assertions.assertTrue(command.contains(YtDlpProgressParser.PROGRESS_TEMPLATE));
    }

    private static VideoSource youtube(String id) {
        return new VideoSource(Site.YOUTUBE, id, "https://www.youtube.com/watch?v=" + id);
    }

    private void awaitStatus(VideoSource video, Status status) {
        Awaitility.await()
                .atMost(Duration.ofSeconds(10))
                .until(() -> service.status(video).status() == status);
    }
}
