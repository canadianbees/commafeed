package com.commafeed.backend.video;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** A single byte range from an HTTP Range header, with inclusive bounds. */
public record ByteRange(long start, long end) {

    private static final Pattern RANGE = Pattern.compile("^bytes=(\\d*)-(\\d*)$");

    public long length() {
        return end - start + 1;
    }

    /**
     * Parses a "bytes=a-b", "bytes=a-" or "bytes=-n" header. Returns empty if the header is
     * missing, unsupported (e.g. multiple ranges) or not satisfiable for a file of this size.
     */
    public static Optional<ByteRange> parse(String header, long fileSize) {
        if (header == null || fileSize <= 0) {
            return Optional.empty();
        }

        Matcher m = RANGE.matcher(header.trim());
        if (!m.matches()) {
            return Optional.empty();
        }

        String from = m.group(1);
        String to = m.group(2);
        try {
            long start;
            long end;
            if (from.isEmpty()) {
                if (to.isEmpty()) {
                    return Optional.empty();
                }
                // suffix range: last n bytes
                long suffix = Long.parseLong(to);
                if (suffix == 0) {
                    return Optional.empty();
                }
                start = Math.max(0, fileSize - suffix);
                end = fileSize - 1;
            } else {
                start = Long.parseLong(from);
                end = to.isEmpty() ? fileSize - 1 : Math.min(Long.parseLong(to), fileSize - 1);
            }

            if (start >= fileSize || start > end) {
                return Optional.empty();
            }
            return Optional.of(new ByteRange(start, end));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }
}
