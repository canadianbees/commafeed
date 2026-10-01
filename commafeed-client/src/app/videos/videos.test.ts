import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { client } from "@/app/client"
import { reducers } from "@/app/store"
import { loadVideoStatuses, requestVideoDownload } from "@/app/videos/thunks"

describe("videos", () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    it("loads the statuses of several videos at once", async () => {
        vi.mocked(client.entry.getVideoStatuses).mockResolvedValue({
            data: { "1": { status: "DONE" }, "2": { status: "NONE" } },
        } as never)
        const store = configureStore({ reducer: reducers })

        await store.dispatch(loadVideoStatuses(["1", "2"]))

        expect(client.entry.getVideoStatuses).toHaveBeenCalledWith(["1", "2"])
        expect(store.getState().videos.statuses["1"].status).toBe("DONE")
        expect(store.getState().videos.statuses["2"].status).toBe("NONE")
    })

    it("does not call the server without videos", async () => {
        const store = configureStore({ reducer: reducers })
        await store.dispatch(loadVideoStatuses([]))
        expect(client.entry.getVideoStatuses).not.toHaveBeenCalled()
    })

    it("keeps the error of a download request", async () => {
        vi.mocked(client.entry.requestVideo).mockRejectedValue(new Error("network down"))
        const store = configureStore({ reducer: reducers })

        await store.dispatch(requestVideoDownload("1"))

        expect(store.getState().videos.requestErrors["1"]).toBe("network down")
    })
})

describe("theater mode", () => {
    it("is off by default and can be turned on and off", async () => {
        const { setTheater } = await import("@/app/videos/slice")
        const store = configureStore({ reducer: reducers })
        expect(store.getState().videos.theater).toBe(false)
        store.dispatch(setTheater(true))
        expect(store.getState().videos.theater).toBe(true)
        store.dispatch(setTheater(false))
        expect(store.getState().videos.theater).toBe(false)
    })
})

describe("vertical videos", () => {
    it("remembers the videos that are taller than wide", async () => {
        const { setVideoVertical } = await import("@/app/videos/slice")
        const store = configureStore({ reducer: reducers })
        store.dispatch(setVideoVertical("1"))
        expect(store.getState().videos.vertical).toEqual({ "1": true })
    })
})
