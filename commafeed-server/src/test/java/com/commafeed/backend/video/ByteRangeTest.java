package com.commafeed.backend.video;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Optional;

class ByteRangeTest {

    @Test
    void parsesBoundedRange() {
        Assertions.assertEquals(
                Optional.of(new ByteRange(10, 19)), ByteRange.parse("bytes=10-19", 100));
    }

    @Test
    void parsesOpenEndedRange() {
        Assertions.assertEquals(
                Optional.of(new ByteRange(10, 99)), ByteRange.parse("bytes=10-", 100));
    }

    @Test
    void parsesSuffixRange() {
        Assertions.assertEquals(
                Optional.of(new ByteRange(90, 99)), ByteRange.parse("bytes=-10", 100));
        Assertions.assertEquals(
                Optional.of(new ByteRange(0, 99)), ByteRange.parse("bytes=-500", 100));
    }

    @Test
    void clampsEndToFileSize() {
        Assertions.assertEquals(
                Optional.of(new ByteRange(0, 99)), ByteRange.parse("bytes=0-1000", 100));
    }

    @Test
    void computesLength() {
        Assertions.assertEquals(10, new ByteRange(10, 19).length());
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "bytes=100-",
                "bytes=50-10",
                "bytes=-",
                "bytes=-0",
                "bytes=0-10,20-30",
                "items=0-10",
                "bytes=a-b",
                "bytes=99999999999999999999-"
            })
    void rejectsInvalidOrUnsatisfiableRanges(String header) {
        Assertions.assertEquals(Optional.empty(), ByteRange.parse(header, 100));
    }

    @Test
    void rejectsMissingHeaderOrEmptyFile() {
        Assertions.assertEquals(Optional.empty(), ByteRange.parse(null, 100));
        Assertions.assertEquals(Optional.empty(), ByteRange.parse("bytes=0-10", 0));
    }
}
