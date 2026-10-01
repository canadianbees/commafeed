package com.commafeed.backend.video;

import com.commafeed.backend.video.YtDlpProgressParser.DownloadProgress;
import com.commafeed.backend.video.YtDlpProgressParser.Stage;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Optional;

class YtDlpProgressParserTest {

    @Test
    void parsesVideoProgress() {
        // real line printed by yt-dlp with our template
        Assertions.assertEquals(
                Optional.of(new DownloadProgress(Stage.VIDEO, 25.0, 291817.3186574263, 1093L)),
                YtDlpProgressParser.parse(
                        "CFPROGRESS|av01.0.08M.08|250|1000|NA|291817.3186574263|1093"));
    }

    @Test
    void parsesAudioProgress() {
        Assertions.assertEquals(
                Stage.AUDIO,
                YtDlpProgressParser.parse("CFPROGRESS|none|10|100|NA|5|1").orElseThrow().stage());
    }

    @Test
    void usesEstimatedTotalWhenTotalIsUnknown() {
        Assertions.assertEquals(
                50.0,
                YtDlpProgressParser.parse("CFPROGRESS|avc1|200|NA|400.0|NA|NA")
                        .orElseThrow()
                        .percent());
    }

    @Test
    void unknownValuesAreNull() {
        Assertions.assertEquals(
                Optional.of(new DownloadProgress(Stage.VIDEO, null, null, null)),
                YtDlpProgressParser.parse("CFPROGRESS|NA|NA|NA|NA|NA|NA"));
    }

    @Test
    void capsPercentAt100() {
        Assertions.assertEquals(
                100.0,
                YtDlpProgressParser.parse("CFPROGRESS|avc1|2000|1000|NA|NA|NA")
                        .orElseThrow()
                        .percent());
    }

    @Test
    void parsesMerging() {
        Assertions.assertEquals(
                Optional.of(new DownloadProgress(Stage.MERGING, null, null, null)),
                YtDlpProgressParser.parse("[Merger] Merging formats into \"video.mp4\""));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(
            strings = {
                "",
                "[download] Destination: video.f137.mp4",
                "ERROR: [youtube] Private video",
                "CFPROGRESS|avc1|1|2",
                "CFPROGRESS|avc1|1|2|3|4|5|6"
            })
    void ignoresOtherLines(String line) {
        Assertions.assertEquals(Optional.empty(), YtDlpProgressParser.parse(line));
    }
}
