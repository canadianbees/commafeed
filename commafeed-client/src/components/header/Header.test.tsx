import { screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { RootState } from "@/app/store"
import type { Layout } from "@/app/types"
import { initialLocalSettings } from "@/app/user/slice"
import { Header } from "@/components/header/Header"
import { renderWithProviders } from "@/test/renderWithProviders"
import { stubScreenSize } from "@/test/screenSize"

const state = (layout: Layout) =>
    ({
        user: {
            settings: { readingMode: "unread", readingOrder: "desc" },
            localSettings: { ...initialLocalSettings, layout },
            profile: { name: "demo" },
        },
    }) as unknown as Partial<RootState>

describe("Header", () => {
    let restore = () => {}
    afterEach(() => restore())

    it("keeps only refresh, sort, search and the profile on phones in the reading pane layout", () => {
        restore = stubScreenSize("phone")
        renderWithProviders(<Header />, state("readingPane"))

        expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Desc" })).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Previous" })).toBeNull()
        expect(screen.queryByRole("button", { name: "Mark all as read" })).toBeNull()
        expect(screen.queryByRole("button", { name: "Unread" })).toBeNull()
    })

    it("keeps the full toolbar in the inline layout", () => {
        restore = stubScreenSize("phone")
        renderWithProviders(<Header />, state("inline"))

        expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Mark all as read" })).toBeInTheDocument()
    })
})
