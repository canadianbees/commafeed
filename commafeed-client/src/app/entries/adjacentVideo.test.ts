import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { client } from "@/app/client"
import { selectAdjacentVideo } from "@/app/entries/thunks"
import { type RootState, reducers } from "@/app/store"
import type { Entries, Entry } from "@/app/types"

const video = (id: string) => ({ id, downloadableVideo: true, read: false, markable: true }) as Entry
const article = (id: string) => ({ id, downloadableVideo: false, read: false, markable: true }) as Entry

const storeWith = (entries: Entry[], selectedEntryId: string, hasMore = false) =>
    configureStore({
        reducer: reducers,
        preloadedState: {
            entries: { entries, selectedEntryId, hasMore, loading: false, source: { type: "category", id: "all" } },
        } as unknown as RootState,
    })

describe("selectAdjacentVideo", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(client.entry.mark).mockResolvedValue({} as never)
    })

    it("selects the next video, skipping other entries", async () => {
        const store = storeWith([video("1"), article("2"), video("3")], "1")
        const found = await store.dispatch(selectAdjacentVideo({ direction: "next" })).unwrap()
        expect(found).toBe(true)
        expect(store.getState().entries.selectedEntryId).toBe("3")
    })

    it("selects the previous video, skipping other entries", async () => {
        const store = storeWith([video("1"), article("2"), video("3")], "3")
        await store.dispatch(selectAdjacentVideo({ direction: "previous" }))
        expect(store.getState().entries.selectedEntryId).toBe("1")
    })

    it("loads more entries at the end of the list", async () => {
        vi.mocked(client.category.getEntries).mockResolvedValue({
            data: { entries: [article("4"), video("5")], hasMore: false } as unknown as Entries,
        } as never)
        const store = storeWith([video("1"), article("2")], "1", true)

        const found = await store.dispatch(selectAdjacentVideo({ direction: "next" })).unwrap()

        expect(found).toBe(true)
        expect(store.getState().entries.selectedEntryId).toBe("5")
    })

    it("reports when there is no other video", async () => {
        const store = storeWith([video("1"), article("2")], "1")
        const found = await store.dispatch(selectAdjacentVideo({ direction: "next" })).unwrap()
        expect(found).toBe(false)
        expect(store.getState().entries.selectedEntryId).toBe("1")
    })
})
