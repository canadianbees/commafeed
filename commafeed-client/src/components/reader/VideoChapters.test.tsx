import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { chapterProgress, currentChapterIndex, VideoChapters } from "@/components/reader/VideoChapters"
import { renderWithProviders } from "@/test/renderWithProviders"

const chapters = [
    { startTime: 0, title: "Planning the layout" },
    { startTime: 760, title: "Demolition" },
    { startTime: 1865, title: "Electrical rough-in" },
]

const fakeVideo = (currentTime: number) => {
    const video = document.createElement("video")
    Object.defineProperty(video, "currentTime", { value: currentTime, writable: true })
    video.play = vi.fn().mockResolvedValue(undefined)
    return video
}

describe("chapter helpers", () => {
    it("finds the chapter being played", () => {
        expect(currentChapterIndex(chapters, 0)).toBe(0)
        expect(currentChapterIndex(chapters, 800)).toBe(1)
        expect(currentChapterIndex(chapters, 5000)).toBe(2)
    })

    it("shows nothing played while the length of the video is unknown", () => {
        expect(chapterProgress([{ startTime: 0, title: "" }], 0, 0)).toEqual([0])
    })

    it("computes how much of each chapter was played", () => {
        const progress = chapterProgress(chapters, 1000, 3000)
        expect(progress[0]).toBe(100)
        expect(progress[1]).toBeCloseTo(((1000 - 760) / (1865 - 760)) * 100)
        expect(progress[2]).toBe(0)
    })
})

describe("VideoChapters", () => {
    it("lists the chapters with their start time and highlights the current one", () => {
        renderWithProviders(<VideoChapters chapters={chapters} duration={3000} video={fakeVideo(800)} />)
        expect(screen.getByText("12:40")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /Demolition/ })).toHaveAttribute("aria-current", "true")
        expect(screen.getByRole("button", { name: /Planning the layout/ })).not.toHaveAttribute("aria-current")
    })

    it("plays the video from the chapter that is clicked", () => {
        const video = fakeVideo(0)
        renderWithProviders(<VideoChapters chapters={chapters} duration={3000} video={video} />)

        fireEvent.click(screen.getByRole("button", { name: /Electrical rough-in/ }))

        expect(video.currentTime).toBe(1865)
        expect(video.play).toHaveBeenCalled()
    })

    it("cannot seek before the video is downloaded", () => {
        renderWithProviders(<VideoChapters chapters={chapters} video={null} />)
        expect(screen.getByRole("button", { name: /Demolition/ })).toBeDisabled()
    })

    it("renders nothing without chapters", () => {
        const { container } = renderWithProviders(<VideoChapters chapters={[]} video={null} />)
        expect(container.querySelector(".cf-video-chapters")).toBeNull()
    })

    it("can be folded and remembers it", () => {
        const { store } = renderWithProviders(<VideoChapters chapters={chapters} duration={3000} video={fakeVideo(800)} />)
        const toggle = screen.getByRole("button", { name: /Chapters/ })
        expect(toggle).toHaveAttribute("aria-expanded", "true")

        fireEvent.click(toggle)

        expect(toggle).toHaveAttribute("aria-expanded", "false")
        expect(store.getState().user.localSettings.chaptersCollapsed).toBe(true)
        // folded: the chapter being played is still shown
        expect(toggle).toHaveTextContent("2 · Demolition")

        fireEvent.click(toggle)
        expect(toggle).toHaveAttribute("aria-expanded", "true")
        expect(store.getState().user.localSettings.chaptersCollapsed).toBe(false)
    })
})
