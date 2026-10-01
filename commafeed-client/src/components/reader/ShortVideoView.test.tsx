import { fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { client } from "@/app/client"
import type { RootState } from "@/app/store"
import type { Entry, VideoDownloadStatus } from "@/app/types"
import { captionParts, ShortVideoView } from "@/components/reader/ShortVideoView"
import { renderWithProviders } from "@/test/renderWithProviders"

const tiktok = (id: string) =>
    ({
        id,
        title: `Flatbread ${id}`,
        content: "<p>Flour, yogurt, salt.</p>",
        url: `https://www.tiktok.com/@quickrecipes/video/723456789012345678${id}`,
        feedName: "@quickrecipes",
        feedId: "2",
        iconUrl: "",
        date: Date.now(),
        read: false,
        starred: false,
        markable: true,
        tags: [],
        downloadableVideo: true,
    }) as unknown as Entry
const article = { ...tiktok("2"), downloadableVideo: false } as Entry

const renderView = (status: VideoDownloadStatus) =>
    renderWithProviders(<ShortVideoView entry={tiktok("1")} onBack={vi.fn()} />, {
        entries: { entries: [tiktok("1"), article, tiktok("3")], selectedEntryId: "1", hasMore: false },
        videos: { statuses: { "1": status }, requestErrors: {}, theater: false, vertical: {} },
    } as unknown as Partial<RootState>)

describe("ShortVideoView", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(client.entry.getVideoInfo).mockResolvedValue({ data: "" } as never)
        vi.mocked(client.entry.mark).mockResolvedValue({} as never)
        vi.mocked(client.entry.star).mockResolvedValue({} as never)
        vi.mocked(client.entry.requestVideo).mockResolvedValue({ data: { status: "QUEUED" } } as never)
        vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined)
        vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {})
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("shows the video with its feed, caption and actions", () => {
        const { container } = renderView({ status: "DONE" })
        expect(container.querySelector("video")).toHaveAttribute("src", "rest/entry/video/1")
        expect(screen.getByText("@quickrecipes")).toBeInTheDocument()
        expect(screen.getByText("Flatbread 1")).toBeInTheDocument()
        expect(screen.getByText("Flour, yogurt, salt.")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Star" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument()
        expect(screen.getByRole("link", { name: "Open on TikTok" })).toHaveAttribute("href", tiktok("1").url)
    })

    it("starts playing, muted with a hint when the browser refuses the sound", async () => {
        vi.mocked(HTMLMediaElement.prototype.play)
            .mockRejectedValueOnce(new DOMException("sound not allowed", "NotAllowedError"))
            .mockResolvedValue(undefined)
        const { container } = renderView({ status: "DONE" })
        const video = container.querySelector("video") as HTMLVideoElement

        fireEvent.click(await screen.findByText("Tap to unmute"))

        expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2)
        expect(video.muted).toBe(false)
    })

    it("downloads the video when it is opened", async () => {
        renderView({ status: "NONE" })
        await waitFor(() => expect(client.entry.requestVideo).toHaveBeenCalledWith("1"))
    })

    it("goes to the next video, skipping other entries", async () => {
        const { store } = renderView({ status: "DONE" })
        fireEvent.click(screen.getByRole("button", { name: /Next video/ }))
        await waitFor(() => expect(store.getState().entries.selectedEntryId).toBe("3"))
    })

    it("stars the video", async () => {
        renderView({ status: "DONE" })
        fireEvent.click(screen.getByRole("button", { name: "Star" }))
        await waitFor(() => expect(client.entry.star).toHaveBeenCalledWith({ id: "1", starred: true }))
    })
})

describe("captionParts", () => {
    it("shows the text once when the description repeats the title", () => {
        expect(captionParts("Flatbread, no oven", "Flatbread,  no oven")).toEqual({ title: "Flatbread, no oven" })
    })

    it("shows the longer description when it starts with the title", () => {
        expect(captionParts("Flatbread, no oven\u2026", "Flatbread, no oven. Flour, yogurt, salt #recipe")).toEqual({
            description: "Flatbread, no oven. Flour, yogurt, salt #recipe",
        })
    })

    it("shows both when they are different", () => {
        expect(captionParts("Flatbread", "Flour, yogurt, salt")).toEqual({ title: "Flatbread", description: "Flour, yogurt, salt" })
    })

    it("shows the title alone without description", () => {
        expect(captionParts("Flatbread", "")).toEqual({ title: "Flatbread" })
    })
})
