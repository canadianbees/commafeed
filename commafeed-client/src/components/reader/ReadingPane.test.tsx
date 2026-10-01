import { screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { RootState } from "@/app/store"
import type { Entry } from "@/app/types"
import { ReadingPane } from "@/components/reader/ReadingPane"
import { renderWithProviders } from "@/test/renderWithProviders"

const entry = {
    id: "1",
    title: "Say what you won't build",
    content: "<p>A short list of non-goals saves time.</p>",
    url: "https://example.com/1",
    feedName: "Open Source Notes",
    feedId: "2",
    iconUrl: "",
    date: Date.now(),
    read: true,
    starred: false,
    markable: true,
    tags: [],
    downloadableVideo: false,
} as unknown as Entry

describe("ReadingPane", () => {
    it("shows a hint when no entry is selected", () => {
        renderWithProviders(<ReadingPane />)
        expect(screen.getByText("Select an entry to read it here.")).toBeInTheDocument()
    })

    it("shows the selected entry with a link to the original", () => {
        renderWithProviders(<ReadingPane entry={entry} />)
        const title = screen.getByRole("heading", { name: "Say what you won't build" })
        expect(title.querySelector("a")).toHaveAttribute("href", "https://example.com/1")
        expect(screen.getByText("A short list of non-goals saves time.")).toBeInTheDocument()
        expect(screen.getByText("Open Source Notes")).toBeInTheDocument()
    })
})

describe("ReadingPane with a downloadable video", () => {
    it("shows the player frame first, then the title and the description without embeds", async () => {
        const { client } = await import("@/app/client")
        vi.mocked(client.entry.getVideoStatus).mockResolvedValue({ data: { status: "NONE" } } as never)
        // no details from the video site: the feed's description is shown
        vi.mocked(client.entry.getVideoInfo).mockResolvedValue({ data: "" } as never)

        const video = {
            ...entry,
            title: "Recreating dappled sunlight",
            downloadableVideo: true,
            content: '<iframe src="https://www.youtube.com/embed/abc"></iframe><img src="thumb.jpg"><p>How the light was set up.</p>',
        } as Entry
        const { container } = renderWithProviders(<ReadingPane entry={video} />, {
            server: { serverInfos: { videoDownloadEnabled: true } } as RootState["server"],
        })

        expect(await screen.findByRole("button", { name: "Download video" })).toBeInTheDocument()
        const article = container.querySelector("article")
        expect(article?.firstElementChild).toHaveClass("cf-video-frame")
        expect(screen.getByText("How the light was set up.")).toBeInTheDocument()
        expect(container.querySelector("iframe")).toBeNull()
        expect(container.querySelector("img[src='thumb.jpg']")).toBeNull()
    })
})

describe("ReadingPane with video details", () => {
    it("shows the full description, the length and the download details", async () => {
        const { client } = await import("@/app/client")
        vi.mocked(client.entry.getVideoInfo).mockResolvedValue({
            data: { description: "Gear list: https://example.com/gear", duration: 1531, chapters: [] },
        } as never)

        const video = { ...entry, downloadableVideo: true } as Entry
        renderWithProviders(<ReadingPane entry={video} />, {
            server: { serverInfos: { videoDownloadEnabled: true } } as RootState["server"],
            videos: {
                statuses: { "1": { status: "DONE", size: 343932928, expiresAt: Date.now() + 29 * 86400000 } },
                requestErrors: {},
                theater: false,
                vertical: {},
            },
        } as Partial<RootState>)

        expect(await screen.findByRole("link", { name: "https://example.com/gear" })).toHaveAttribute("href", "https://example.com/gear")
        expect(screen.getByText("25:31")).toBeInTheDocument()
        expect(screen.getByText("Downloaded · 328 MB")).toBeInTheDocument()
        expect(screen.getByText("Removed in 29 days")).toBeInTheDocument()
    })
})

describe("ReadingPane in theater mode", () => {
    const originalMatchMedia = window.matchMedia

    beforeEach(() => {
        // theater mode is for desktop screens: make min-width media queries match
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: query.includes("min-width"),
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }))
    })

    afterEach(() => {
        window.matchMedia = originalMatchMedia
    })

    it("shows the chapters next to the video", async () => {
        const { client } = await import("@/app/client")
        vi.mocked(client.entry.getVideoInfo).mockResolvedValue({
            data: { description: "A full renovation.", duration: 8076, chapters: [{ startTime: 0, title: "Planning" }] },
        } as never)

        const video = { ...entry, downloadableVideo: true } as Entry
        const { container } = renderWithProviders(<ReadingPane entry={video} />, {
            server: { serverInfos: { videoDownloadEnabled: true } } as RootState["server"],
            entries: { entries: [video], selectedEntryId: video.id } as unknown as RootState["entries"],
            user: { localSettings: { layout: "readingPane", fontSizePercentage: 100 } } as unknown as RootState["user"],
            videos: { statuses: { "1": { status: "DONE" } }, requestErrors: {}, theater: true, vertical: {} },
        } as Partial<RootState>)

        expect(await screen.findByRole("button", { name: /Planning/ })).toBeInTheDocument()
        expect(container.querySelector(".cf-theater")).not.toBeNull()
        expect(screen.getByRole("button", { name: "Exit theater" })).toHaveAttribute("aria-pressed", "true")
    })
})

describe("ReadingPane with a long video on phones", () => {
    it("lists the chapters under the details, without theater mode, and shows the time left", async () => {
        const { client } = await import("@/app/client")
        vi.mocked(client.entry.getVideoInfo).mockResolvedValue({
            data: { description: "A full renovation.", duration: 8076, chapters: [{ startTime: 0, title: "Planning" }] },
        } as never)

        const video = { ...entry, downloadableVideo: true, videoPosition: 3735 } as Entry
        const { container } = renderWithProviders(<ReadingPane entry={video} compact />, {
            server: { serverInfos: { videoDownloadEnabled: true } } as RootState["server"],
            videos: { statuses: { "1": { status: "DONE" } }, requestErrors: {}, theater: false, vertical: {} },
        } as unknown as Partial<RootState>)

        expect(await screen.findByRole("button", { name: /Planning/ })).toBeInTheDocument()
        expect(screen.getByText("1:12:21 left")).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Theater" })).toBeNull()
        // the actions come after the video details, the player sticks to the top
        const article = container.querySelector(".cf-phone-video") as Element
        expect(article.firstElementChild?.querySelector(".cf-video-frame")).not.toBeNull()
        expect(container.querySelector(".cf-phone-video-actions")).not.toBeNull()
    })
})
