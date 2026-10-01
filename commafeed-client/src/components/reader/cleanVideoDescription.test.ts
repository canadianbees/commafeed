import { describe, expect, it } from "vitest"
import { cleanVideoDescription } from "@/components/reader/cleanVideoDescription"

describe("cleanVideoDescription", () => {
    it("removes the video site's embedded player and the thumbnails", () => {
        const html = `
            <iframe src="https://www.youtube-nocookie.com/embed/abc"></iframe>
            <p><img src="https://i.ytimg.com/vi/abc/hq.jpg"></p>
            <p>Behind the scenes of the shoot.</p>`
        expect(cleanVideoDescription(html)).toBe("<p>Behind the scenes of the shoot.</p>")
    })

    it("keeps iframes from other sites", () => {
        const html = `<iframe src="https://example.com/map"></iframe><p>Text</p>`
        expect(cleanVideoDescription(html)).toContain('src="https://example.com/map"')
    })

    it("removes links left empty and trailing line breaks", () => {
        const html = `<a href="https://www.youtube.com/watch?v=abc"><img src="thumb.jpg"></a><br><p>Text</p><br>`
        expect(cleanVideoDescription(html)).toBe("<p>Text</p>")
    })

    it("handles missing descriptions", () => {
        expect(cleanVideoDescription(undefined)).toBe("")
        expect(cleanVideoDescription("")).toBe("")
    })
})
