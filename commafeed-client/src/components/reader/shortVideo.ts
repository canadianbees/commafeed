const TIKTOK_HOSTS = new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com"])
const TIKTOK_SHORT_HOSTS = new Set(["vm.tiktok.com", "vt.tiktok.com"])
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"])

/**
 * Whether the url is a short, vertical video: a TikTok video or a YouTube Short. Uses the same hosts as the server
 * (VideoUrlParser).
 */
export const isShortVideoUrl = (url: string | undefined): boolean => {
    if (!url) return false

    let parsed: URL
    try {
        parsed = new URL(url.trim())
    } catch {
        return false
    }

    const host = parsed.hostname.toLowerCase()
    const path = parsed.pathname
    if (TIKTOK_SHORT_HOSTS.has(host)) return /^\/[A-Za-z0-9]+\/?$/.test(path)
    if (TIKTOK_HOSTS.has(host)) return /^\/(@[^/]+\/video|embed)\/\d+\/?$/.test(path)
    if (YOUTUBE_HOSTS.has(host)) return /^\/shorts\/[A-Za-z0-9_-]{11}\/?$/.test(path)
    return false
}
