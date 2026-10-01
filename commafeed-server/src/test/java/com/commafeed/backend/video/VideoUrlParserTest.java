package com.commafeed.backend.video;

import com.commafeed.backend.video.VideoSource.Site;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Optional;

class VideoUrlParserTest {

    @ParameterizedTest
    @ValueSource(
            strings = {
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "https://youtube.com/watch?v=dQw4w9WgXcQ",
                "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
                "https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ",
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42",
                "https://youtu.be/dQw4w9WgXcQ",
                "https://www.youtube.com/shorts/dQw4w9WgXcQ",
                "https://www.youtube.com/live/dQw4w9WgXcQ",
                " https://www.youtube.com/watch?v=dQw4w9WgXcQ ",
            })
    void parsesYoutubeUrls(String url) {
        Assertions.assertEquals(
                Optional.of(
                        new VideoSource(
                                Site.YOUTUBE,
                                "dQw4w9WgXcQ",
                                "https://www.youtube.com/watch?v=dQw4w9WgXcQ")),
                VideoUrlParser.parse(url));
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "https://www.tiktok.com/@some.user_1/video/7234567890123456789",
                "https://tiktok.com/@some.user_1/video/7234567890123456789",
                "https://m.tiktok.com/@some.user_1/video/7234567890123456789/",
                "https://www.tiktok.com/@some.user_1/video/7234567890123456789?is_from_webapp=1",
            })
    void parsesTiktokUrls(String url) {
        Assertions.assertEquals(
                Optional.of(
                        new VideoSource(
                                Site.TIKTOK,
                                "7234567890123456789",
                                "https://www.tiktok.com/@some.user_1/video/7234567890123456789")),
                VideoUrlParser.parse(url));
    }

    @Test
    void parsesTiktokEmbedUrl() {
        Assertions.assertEquals(
                Optional.of(
                        new VideoSource(
                                Site.TIKTOK,
                                "7234567890123456789",
                                "https://www.tiktok.com/embed/7234567890123456789")),
                VideoUrlParser.parse("https://www.tiktok.com/embed/7234567890123456789"));
    }

    @Test
    void parsesTiktokShortUrls() {
        Assertions.assertEquals(
                Optional.of(
                        new VideoSource(
                                Site.TIKTOK, "short-ZMabc123", "https://vm.tiktok.com/ZMabc123")),
                VideoUrlParser.parse("https://vm.tiktok.com/ZMabc123/"));
        Assertions.assertEquals(
                Optional.of(
                        new VideoSource(
                                Site.TIKTOK, "short-ZMabc123", "https://vt.tiktok.com/ZMabc123")),
                VideoUrlParser.parse("https://vt.tiktok.com/ZMabc123"));
    }

    @Test
    void keyIsUniqueAcrossSites() {
        Assertions.assertEquals(
                "youtube-dQw4w9WgXcQ",
                VideoUrlParser.parse("https://youtu.be/dQw4w9WgXcQ").orElseThrow().key());
        Assertions.assertEquals(
                "tiktok-7234567890123456789",
                VideoUrlParser.parse("https://www.tiktok.com/@a/video/7234567890123456789")
                        .orElseThrow()
                        .key());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(
            strings = {
                // youtube
                "https://www.youtube.com/channel/UC1234567890",
                "https://www.youtube.com/watch",
                "https://www.youtube.com/watch?v=tooShort",
                "https://www.youtube.com/watch?v=waytoolongvideoid",
                "https://www.youtube.com/watch?v=--rm-rf-/_x",
                "https://www.youtube.com/watch?v=abc%20defghi",
                "https://www.youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
                "https://evil.com/watch?v=dQw4w9WgXcQ",
                // tiktok
                "https://www.tiktok.com/@some.user",
                "https://www.tiktok.com/@some.user/photo/7234567890123456789",
                "https://www.tiktok.com/@some.user/video/notanumber",
                "https://www.tiktok.com/@some%20user/video/7234567890123456789",
                "https://www.tiktok.com/@--exec/video/7234567890123456789/extra",
                "https://www.tiktok.com/tag/funny",
                "https://www.tiktok.com.evil.com/@a/video/7234567890123456789",
                "https://vm.tiktok.com/abc",
                "https://vm.tiktok.com/ZMabc123/extra",
                "https://vm.tiktok.com/ZM-abc_123",
                "not a url",
            })
    void rejectsOtherUrls(String url) {
        Assertions.assertEquals(Optional.empty(), VideoUrlParser.parse(url));
    }
}
