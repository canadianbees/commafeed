import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { RootState } from "@/app/store"
import type { Category } from "@/app/types"
import { TheaterRail } from "@/components/reader/TheaterRail"
import { renderWithProviders } from "@/test/renderWithProviders"

const root = {
    id: "all",
    name: "All",
    expanded: true,
    position: 0,
    children: [],
    feeds: [
        { id: 1, name: "Workshop Channel", iconUrl: "", unread: 3 },
        { id: 2, name: "Read everything", iconUrl: "", unread: 0 },
    ],
} as unknown as Category

describe("TheaterRail", () => {
    const state = {
        tree: { rootCategory: root },
        videos: { statuses: {}, requestErrors: {}, theater: true },
    } as unknown as Partial<RootState>

    it("shows all entries, starred and the feeds with unread entries", () => {
        renderWithProviders(<TheaterRail />, state)
        expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Starred" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Workshop Channel" })).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Read everything" })).toBeNull()
    })

    it("leaves theater mode when going somewhere else", () => {
        const { store } = renderWithProviders(<TheaterRail />, state)
        fireEvent.click(screen.getByRole("button", { name: "Workshop Channel" }))
        expect(store.getState().videos.theater).toBe(false)
        expect(store.getState().redirect.to).toBe("/app/feed/1")
    })
})
