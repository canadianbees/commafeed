package com.commafeed.backend.video;

import com.commafeed.CommaFeedConfiguration;
import com.commafeed.backend.video.VideoInfoService.Chapter;
import com.commafeed.backend.video.VideoInfoService.VideoInfo;
import com.commafeed.backend.video.VideoSource.Site;
import com.fasterxml.jackson.databind.ObjectMapper;

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
import java.util.Optional;

// the tests run a fake yt-dlp written as a shell script, which Windows can't execute
@DisabledOnOs(value = OS.WINDOWS, disabledReason = "fake yt-dlp is a shell script")
class VideoInfoServiceTest {

    private static final String FAKE_YT_DLP = "src/test/resources/video/fake-yt-dlp.sh";

    @TempDir private Path cacheDir;

    private CommaFeedConfiguration.VideoDownload videoConfig;
    private VideoInfoService service;

    @BeforeEach
    void init() {
        videoConfig = Mockito.mock(CommaFeedConfiguration.VideoDownload.class);
        Mockito.when(videoConfig.ytDlpPath())
                .thenReturn(Path.of(FAKE_YT_DLP).toAbsolutePath().toString());
        Mockito.when(videoConfig.cacheDirectory()).thenReturn(cacheDir.toString());

        CommaFeedConfiguration config = Mockito.mock(CommaFeedConfiguration.class);
        Mockito.when(config.videoDownload()).thenReturn(videoConfig);
        Mockito.when(config.shutdownTimeout()).thenReturn(Duration.ofMillis(100));

        service =
                new VideoInfoService(config, new VideoDownloadService(config), new ObjectMapper());
    }

    private static VideoSource youtube(String id) {
        return new VideoSource(Site.YOUTUBE, id, "https://www.youtube.com/watch?v=" + id);
    }

    @Test
    void readsDescriptionDurationAndChapters() {
        VideoInfo info = service.info(youtube("vid00000001")).orElseThrow();

        Assertions.assertEquals(
                "How the light was set up.\nGear: https://example.com/gear", info.description());
        Assertions.assertEquals(1531.0, info.duration());
        Assertions.assertEquals(
                List.of(new Chapter(0, "Intro"), new Chapter(60, "Setup")), info.chapters());
    }

    @Test
    void cachesTheDetails() {
        VideoSource video = youtube("vid00000001");
        service.info(video);
        Assertions.assertTrue(Files.isRegularFile(service.resolveInfoFile(video)));

        // yt-dlp is not called anymore once the details are cached
        Mockito.when(videoConfig.ytDlpPath()).thenReturn("/does/not/exist/yt-dlp");
        Assertions.assertEquals(
                "How the light was set up.\nGear: https://example.com/gear",
                service.info(video).orElseThrow().description());
    }

    @Test
    void returnsNothingWhenYtDlpFails() {
        VideoSource video = youtube("fail0000000");
        Assertions.assertEquals(Optional.empty(), service.info(video));
        Assertions.assertFalse(Files.exists(service.resolveInfoFile(video)));
    }

    @Test
    void ignoresMissingFields() throws Exception {
        VideoInfo info =
                VideoInfoService.parse(
                        new ObjectMapper()
                                .readTree("{\"chapters\":[{\"title\":\"no start time\"}]}"));
        Assertions.assertNull(info.description());
        Assertions.assertNull(info.duration());
        Assertions.assertEquals(List.of(), info.chapters());
    }

    @Test
    void doesNotDownloadTheVideo() {
        Assertions.assertTrue(
                service.buildCommand(youtube("vid00000001")).contains("--skip-download"));
    }
}
