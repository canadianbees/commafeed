import { fireEvent, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { client } from "@/app/client"
import type { RootState } from "@/app/store"
import type { Entry } from "@/app/types"
import { PhoneEntryView, useEntryView } from "@/components/reader/PhoneEntryView"
import { renderWithProviders } from "@/test/renderWithProviders"

const entry = {
    id: "1",
    title: "Keeping a small project healthy",
    content: "<p>What changes when strangers depend on your code.</p>",
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

const state = { entries: { entries: [entry], selectedEntryId: "1" } } as unknown as Partial<RootState>

function OpenButton() {
    const { openView } = useEntryView()
    return (
        <button type="button" onClick={openView}>
            open
        </button>
    )
}

const renderAt = (entryOpen: boolean) =>
    renderWithProviders(
        <MemoryRouter
            initialEntries={["/app/category/all", { pathname: "/app/category/all", state: { timestamp: 1, entryOpen } }]}
            initialIndex={1}
        >
            <Routes>
                <Route
                    path="/app/category/all"
                    element={
                        <>
                            <OpenButton />
                            <PhoneEntryView />
                        </>
                    }
                />
            </Routes>
        </MemoryRouter>,
        state
    )

describe("PhoneEntryView", () => {
    it("shows the selected entry full screen with its feed", () => {
        renderAt(true)
        expect(screen.getByRole("dialog", { name: "Keeping a small project healthy" })).toBeInTheDocument()
        expect(screen.getAllByText("Open Source Notes").length).toBeGreaterThan(0)
        expect(screen.getByText("What changes when strangers depend on your code.")).toBeInTheDocument()
    })

    it("is not shown when not opened", () => {
        renderAt(false)
        expect(screen.queryByRole("dialog")).toBeNull()
    })

    it("opens from the list and goes back to it", () => {
        renderAt(false)
        fireEvent.click(screen.getByRole("button", { name: "open" }))
        expect(screen.getByRole("dialog")).toBeInTheDocument()

        fireEvent.click(screen.getByRole("button", { name: "Back to entries" }))
        expect(screen.queryByRole("dialog")).toBeNull()
    })
})

describe("PhoneEntryView with a short video", () => {
    it("opens TikTok videos in the short video viewer", () => {
        vi.mocked(client.entry.getVideoInfo).mockResolvedValue({ data: "" } as never)
        const video = {
            ...entry,
            id: "7",
            downloadableVideo: true,
            url: "https://www.tiktok.com/@quickrecipes/video/7234567890123456789",
        } as Entry
        renderWithProviders(
            <MemoryRouter initialEntries={[{ pathname: "/app/category/all", state: { entryOpen: true } }]}>
                <Routes>
                    <Route path="/app/category/all" element={<PhoneEntryView />} />
                </Routes>
            </MemoryRouter>,
            {
                entries: { entries: [video], selectedEntryId: "7" },
                videos: { statuses: { "7": { status: "DOWNLOADING" } }, requestErrors: {}, theater: false, vertical: {} },
            } as unknown as Partial<RootState>
        )
        expect(screen.getByRole("dialog").querySelector(".cf-short-video")).not.toBeNull()
    })
})
