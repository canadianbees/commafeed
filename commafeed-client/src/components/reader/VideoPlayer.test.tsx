import { act, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { RootState } from "@/app/store"
import { VideoPlayer } from "@/components/reader/VideoPlayer"
import { renderWithProviders } from "@/test/renderWithProviders"

const chapters = [
    { startTime: 0, title: "Planning the layout" },
    { startTime: 760, title: "Demolition" },
    { startTime: 1865, title: "Electrical rough-in" },
]

/** jsdom doesn't play videos: fake the playback state of the element. */
const fakePlayback = (video: HTMLVideoElement, duration: number) => {
    let paused = true
    Object.defineProperty(video, "duration", { configurable: true, value: duration })
    Object.defineProperty(video, "paused", { configurable: true, get: () => paused })
    Object.defineProperty(video, "currentTime", {
        configurable: true,
        writable: true,
        value: 0,
    })
    video.play = vi.fn(() => {
        paused = false
        video.dispatchEvent(new Event("play"))
        return Promise.resolve()
    })
    video.pause = vi.fn(() => {
        paused = true
        video.dispatchEvent(new Event("pause"))
    })
    act(() => {
        video.dispatchEvent(new Event("loadedmetadata"))
    })
}

const setTime = (video: HTMLVideoElement, time: number) =>
    act(() => {
        video.currentTime = time
        video.dispatchEvent(new Event("timeupdate"))
    })

const renderPlayer = (props: Partial<Parameters<typeof VideoPlayer>[0]> = {}) => {
    const result = renderWithProviders(<VideoPlayer src="rest/entry/video/1" chapters={chapters} {...props} />, {
        videos: { statuses: {}, requestErrors: {}, theater: false },
    } as unknown as Partial<RootState>)
    const video = result.container.querySelector("video") as HTMLVideoElement
    fakePlayback(video, 3000)
    return { ...result, video }
}

describe("VideoPlayer", () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("plays the downloaded video", () => {
        const { video } = renderPlayer()
        expect(video).toHaveAttribute("src", "rest/entry/video/1")
    })

    it("plays and pauses", () => {
        const { video } = renderPlayer()

        fireEvent.click(screen.getAllByRole("button", { name: "Play" })[0])
        expect(video.play).toHaveBeenCalled()
        expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument()

        fireEvent.click(screen.getByRole("button", { name: "Pause" }))
        expect(video.pause).toHaveBeenCalled()
    })

    it("shows one seek bar segment per chapter and the current chapter", () => {
        const { container, video } = renderPlayer()
        setTime(video, 800)

        expect(container.querySelectorAll(".cf-video-player-controls [aria-hidden] > div")).toHaveLength(3)
        expect(screen.getByText("Chapter 2 · Demolition")).toBeInTheDocument()
        expect(screen.getByText("13:20 / 50:00")).toBeInTheDocument()
    })

    it("seeks with the seek bar", () => {
        const { video } = renderPlayer()
        fireEvent.change(screen.getByRole("slider", { name: "Seek" }), { target: { value: "1865" } })
        expect(video.currentTime).toBe(1865)
    })

    it("handles its keyboard shortcuts without triggering the page's", () => {
        const { container, video } = renderPlayer()
        const pageShortcut = vi.fn()
        document.addEventListener("keydown", pageShortcut)
        setTime(video, 100)

        fireEvent.keyDown(container.querySelector(".cf-video-player") as Element, { key: "ArrowRight" })
        fireEvent.keyDown(container.querySelector(".cf-video-player") as Element, { key: " " })

        expect(video.currentTime).toBe(105)
        expect(video.play).toHaveBeenCalled()
        expect(pageShortcut).not.toHaveBeenCalled()
        document.removeEventListener("keydown", pageShortcut)
    })

    it("mutes and changes the volume", () => {
        const { video } = renderPlayer()
        fireEvent.click(screen.getByRole("button", { name: "Mute" }))
        expect(video.muted).toBe(true)

        fireEvent.change(screen.getByRole("slider", { name: "Volume" }), { target: { value: "0.5" } })
        expect(video.volume).toBe(0.5)
        expect(video.muted).toBe(false)
    })

    it("changes the playback speed", async () => {
        const { video } = renderPlayer()
        fireEvent.click(screen.getByRole("button", { name: "Playback speed" }))
        fireEvent.click(await screen.findByRole("menuitem", { name: "1.5×" }))
        expect(video.playbackRate).toBe(1.5)
    })

    it("turns theater mode on", () => {
        const { store } = renderPlayer({ theaterToggle: true })
        fireEvent.click(screen.getByRole("button", { name: "Theater" }))
        expect(store.getState().videos.theater).toBe(true)
    })

    it("hides the controls while playing and shows them when the mouse moves", () => {
        const { container, video } = renderPlayer()
        const player = container.querySelector(".cf-video-player") as Element
        const controls = container.querySelector(".cf-video-player-controls") as Element
        const visible = () => !controls.className.includes("hidden")

        fireEvent.mouseMove(player)
        act(() => {
            video.play()
        })
        act(() => {
            vi.advanceTimersByTime(3000)
        })
        expect(visible()).toBe(false)

        fireEvent.mouseMove(player)
        expect(visible()).toBe(true)
    })

    it("uses a single segment without chapters", () => {
        const { container } = renderPlayer({ chapters: [] })
        expect(container.querySelectorAll(".cf-video-player-controls [aria-hidden] > div")).toHaveLength(1)
        expect(container.querySelector(".cf-video-player-chapter")).toBeNull()
    })

    it("reports the size of the video", () => {
        const onVideoSize = vi.fn()
        const { video } = renderPlayer({ onVideoSize })
        Object.defineProperty(video, "videoWidth", { configurable: true, value: 1080 })
        Object.defineProperty(video, "videoHeight", { configurable: true, value: 1920 })

        fireEvent.loadedMetadata(video)

        expect(onVideoSize).toHaveBeenCalledWith(1080, 1920)
    })

    describe("resume where the user stopped", () => {
        it("offers to resume from the saved position", () => {
            const { video } = renderPlayer({ resumeAt: 754 })
            expect(screen.getByText("You stopped at 12:34")).toBeInTheDocument()

            fireEvent.click(screen.getByRole("button", { name: /Resume/ }))

            expect(video.currentTime).toBe(754)
            expect(video.play).toHaveBeenCalled()
            expect(screen.queryByText("You stopped at 12:34")).toBeNull()
        })

        it("can start over", () => {
            const { video } = renderPlayer({ resumeAt: 754 })
            video.currentTime = 754

            fireEvent.click(screen.getByRole("button", { name: "Start over" }))

            expect(video.currentTime).toBe(0)
            expect(video.play).toHaveBeenCalled()
        })

        it("does not offer to resume a video stopped at its very end", () => {
            renderPlayer({ resumeAt: 2995 })
            expect(screen.queryByText(/You stopped at/)).toBeNull()
        })

        it("does not offer to resume without a saved position", () => {
            renderPlayer()
            expect(screen.queryByText(/You stopped at/)).toBeNull()
        })

        it("hides the offer once the video plays", () => {
            const { video } = renderPlayer({ resumeAt: 754 })
            act(() => {
                video.play()
            })
            expect(screen.queryByText("You stopped at 12:34")).toBeNull()
        })
    })
})
