import { configureStore } from "@reduxjs/toolkit"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { selectEntry } from "@/app/entries/thunks"
import { registerScrollContainer } from "@/app/scrollContainers"
import { type RootState, reducers } from "@/app/store"
import type { Entry } from "@/app/types"

describe("selecting an entry in the reading pane layout", () => {
    const entry = { id: "1", read: false, markable: true } as Entry
    let pane: HTMLDivElement
    let card: HTMLElement

    beforeEach(() => {
        vi.resetAllMocks()
        pane = document.createElement("div")
        pane.scrollTo = vi.fn()
        registerScrollContainer("entries", document.createElement("div"))
        registerScrollContainer("readingPane", pane)

        card = document.createElement("article")
        card.id = "entry-id-1"
        card.scrollIntoView = vi.fn()
        document.body.appendChild(card)
    })

    afterEach(() => {
        registerScrollContainer("entries", null)
        registerScrollContainer("readingPane", null)
        card.remove()
    })

    it("selects the entry without expanding it, shows it from the top and keeps its card visible", async () => {
        const store = configureStore({
            reducer: reducers,
            preloadedState: { entries: { entries: [entry] } } as unknown as RootState,
        })

        await store.dispatch(selectEntry({ entry, expand: true, markAsRead: false, scrollToEntry: true }))

        expect(store.getState().entries.selectedEntryId).toBe("1")
        expect(store.getState().entries.entries[0].expanded).toBe(false)
        expect(pane.scrollTo).toHaveBeenCalledWith({ top: 0 })
        expect(card.scrollIntoView).toHaveBeenCalledWith({ block: "nearest" })
    })
})
