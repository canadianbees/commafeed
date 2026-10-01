package com.commafeed.backend.video;

import com.commafeed.backend.video.VideoSource.Site;

import lombok.experimental.UtilityClass;

import org.apache.commons.lang3.StringUtils;

import java.net.URI;
import java.util.Arrays;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Finds downloadable videos in entry urls.
 *
 * <p>The url given to yt-dlp is always rebuilt from validated parts, the entry url is never passed
 * as is.
 */
@UtilityClass
public class VideoUrlParser {

    private static final Set<String> YOUTUBE_HOSTS =
            Set.of("youtube.com", "www.youtube.com", "m.youtube.com");
    private static final Pattern YOUTUBE_ID = Pattern.compile("^[A-Za-z0-9_-]{11}$");

    private static final Set<String> TIKTOK_HOSTS =
            Set.of("tiktok.com", "www.tiktok.com", "m.tiktok.com");
    private static final Set<String> TIKTOK_SHORT_HOSTS = Set.of("vm.tiktok.com", "vt.tiktok.com");
    private static final Pattern TIKTOK_VIDEO_PATH =
            Pattern.compile("^/@([A-Za-z0-9_.-]{1,64})/video/(\\d{5,25})/?$");
    private static final Pattern TIKTOK_EMBED_PATH = Pattern.compile("^/embed/(\\d{5,25})/?$");
    private static final Pattern TIKTOK_SHORT_PATH = Pattern.compile("^/([A-Za-z0-9]{5,16})/?$");

    public static Optional<VideoSource> parse(String url) {
        if (StringUtils.isBlank(url)) {
            return Optional.empty();
        }

        URI uri;
        try {
            uri = URI.create(url.trim());
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }

        if (uri.getHost() == null) {
            return Optional.empty();
        }
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        String path = Objects.requireNonNullElse(uri.getPath(), "");

        if (host.equals("youtu.be") || YOUTUBE_HOSTS.contains(host)) {
            return youtube(host, path, uri.getRawQuery());
        }
        if (TIKTOK_HOSTS.contains(host) || TIKTOK_SHORT_HOSTS.contains(host)) {
            return tiktok(host, path);
        }
        return Optional.empty();
    }

    private static Optional<VideoSource> youtube(String host, String path, String query) {
        String id = null;
        if (host.equals("youtu.be")) {
            id = path.startsWith("/") ? path.substring(1) : path;
        } else if (path.equals("/watch")) {
            id = queryParam(query, "v");
        } else if (path.startsWith("/shorts/") || path.startsWith("/live/")) {
            id = StringUtils.substringAfterLast(path, "/");
        }

        return Optional.ofNullable(id)
                .filter(i -> YOUTUBE_ID.matcher(i).matches())
                .map(i -> new VideoSource(Site.YOUTUBE, i, "https://www.youtube.com/watch?v=" + i));
    }

    private static Optional<VideoSource> tiktok(String host, String path) {
        if (TIKTOK_SHORT_HOSTS.contains(host)) {
            // short share links redirect to the video, yt-dlp resolves them
            Matcher m = TIKTOK_SHORT_PATH.matcher(path);
            return m.matches()
                    ? Optional.of(
                            new VideoSource(
                                    Site.TIKTOK,
                                    "short-" + m.group(1),
                                    "https://" + host + "/" + m.group(1)))
                    : Optional.empty();
        }

        Matcher video = TIKTOK_VIDEO_PATH.matcher(path);
        if (video.matches()) {
            String user = video.group(1);
            String id = video.group(2);
            return Optional.of(
                    new VideoSource(
                            Site.TIKTOK, id, "https://www.tiktok.com/@" + user + "/video/" + id));
        }

        Matcher embed = TIKTOK_EMBED_PATH.matcher(path);
        if (embed.matches()) {
            String id = embed.group(1);
            return Optional.of(
                    new VideoSource(Site.TIKTOK, id, "https://www.tiktok.com/embed/" + id));
        }

        return Optional.empty();
    }

    private static String queryParam(String query, String name) {
        if (query == null) {
            return null;
        }
        return Arrays.stream(query.split("&"))
                .filter(p -> p.startsWith(name + "="))
                .map(p -> p.substring(name.length() + 1))
                .findFirst()
                .orElse(null);
    }
}
