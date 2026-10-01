import { describe, expect, it } from "vitest"
import { isShortVideoUrl } from "@/components/reader/shortVideo"

describe("isShortVideoUrl", () => {
    it.each([
        "https://www.tiktok.com/@some.user/video/7234567890123456789",
        "https://tiktok.com/@some.user/video/7234567890123456789?is_from_webapp=1",
        "https://www.tiktok.com/embed/7234567890123456789",
        "https://vm.tiktok.com/ZMabc123/",
        "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    ])("recognizes %s", url => {
        expect(isShortVideoUrl(url)).toBe(true)
    })

    it.each([
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://www.tiktok.com/@some.user",
        "https://www.tiktok.com/@some.user/photo/7234567890123456789",
        "https://www.tiktok.com.evil.com/@a/video/7234567890123456789",
        "https://example.com/shorts/dQw4w9WgXcQ",
        "not a url",
        "",
        undefined,
    ])("ignores %s", url => {
        expect(isShortVideoUrl(url)).toBe(false)
    })
})
