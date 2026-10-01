package com.commafeed.backend.video;

/**
 * A video that can be downloaded with yt-dlp.
 *
 * @param site the website hosting the video
 * @param id the video id on that site, only contains characters safe for file names
 * @param url the url passed to yt-dlp, rebuilt from validated parts of the entry url
 */
public record VideoSource(Site site, String id, String url) {

    /** Unique key of the video across sites, also used as the file name. */
    public String key() {
        return site.name().toLowerCase() + "-" + id;
    }

    public enum Site {
        YOUTUBE,
        TIKTOK
    }
}
