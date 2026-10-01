import { configureStore } from "@reduxjs/toolkit"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { Provider } from "react-redux"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { client } from "@/app/client"
import { type RootState, reducers } from "@/app/store"
import type { Entry } from "@/app/types"
import { SAVE_INTERVAL, useVideoPositionSaving } from "@/hooks/useVideoPositionSaving"

const fakeVideo = () => {
    const video = document.createElement("video")
    let paused = true
    let ended = false
    Object.defineProperty(video, "paused", { configurable: true, get: () => paused })
    Object.defineProperty(video, "ended", { configurable: true, get: () => ended })
    Object.defineProperty(video, "currentTime", { configurable: true, writable: true, value: 0 })
    return {
        video,
        play: () => {
            paused = false
        },
        pause: () => {
            paused = true
            video.dispatchEvent(new Event("pause"))
        },
        end: () => {
            paused = true
            ended = true
            video.dispatchEvent(new Event("ended"))
        },
    }
}

const setup = () => {
    const store = configureStore({
        reducer: reducers,
        preloadedState: { entries: { entries: [{ id: "1" } as Entry] } } as unknown as RootState,
    })
    const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>
    const fake = fakeVideo()
    const hook = renderHook(() => useVideoPositionSaving("1", fake.video), { wrapper })
    return { store, fake, hook }
}

describe("useVideoPositionSaving", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.mocked(client.entry.saveVideoPosition).mockResolvedValue({} as never)
        vi.mocked(client.entry.saveVideoPositionOnExit).mockResolvedValue(undefined)
    })

    afterEach(() => {
        vi.clearAllMocks()
        vi.useRealTimers()
    })

    it("saves the position regularly while playing", () => {
        const { fake, store } = setup()
        fake.play()
        fake.video.currentTime = 42.7

        act(() => {
            vi.advanceTimersByTime(SAVE_INTERVAL)
        })

        expect(client.entry.saveVideoPosition).toHaveBeenCalledWith("1", 42)
        expect(store.getState().entries.entries[0].videoPosition).toBe(42)
    })

    it("saves the position on pause, once", () => {
        const { fake } = setup()
        fake.play()
        fake.video.currentTime = 600

        act(() => fake.pause())
        act(() => fake.pause())

        expect(client.entry.saveVideoPosition).toHaveBeenCalledTimes(1)
        expect(client.entry.saveVideoPosition).toHaveBeenCalledWith("1", 600)
    })

    it("clears the position when the video ends", () => {
        const { fake, store } = setup()
        fake.play()
        fake.video.currentTime = 600
        act(() => fake.pause())

        act(() => fake.end())

        expect(client.entry.saveVideoPosition).toHaveBeenLastCalledWith("1", null)
        expect(store.getState().entries.entries[0].videoPosition).toBeUndefined()
    })

    it("clears a saved position when stopping at the very beginning, e.g. after starting over", () => {
        const store = configureStore({
            reducer: reducers,
            preloadedState: { entries: { entries: [{ id: "1", videoPosition: 600 } as Entry] } } as unknown as RootState,
        })
        const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>
        const fake = fakeVideo()
        renderHook(() => useVideoPositionSaving("1", fake.video, 600), { wrapper })
        fake.play()
        fake.video.currentTime = 2

        act(() => fake.pause())

        expect(client.entry.saveVideoPosition).toHaveBeenCalledWith("1", null)
    })

    it("does not keep positions at the very beginning", () => {
        const { fake } = setup()
        fake.play()
        fake.video.currentTime = 3
        act(() => fake.pause())
        expect(client.entry.saveVideoPosition).not.toHaveBeenCalled()
    })

    it("saves the position when leaving the entry", () => {
        const { fake, hook } = setup()
        fake.play()
        fake.video.currentTime = 120

        hook.unmount()

        expect(client.entry.saveVideoPositionOnExit).toHaveBeenCalledWith("1", 120)
    })
})
