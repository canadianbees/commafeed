import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { RootState } from "@/app/store"
import { FilterToggle } from "@/components/reader/FilterToggle"
import { renderWithProviders } from "@/test/renderWithProviders"

const state = { user: { settings: { readingMode: "unread" }, localSettings: {} } } as unknown as Partial<RootState>

describe("FilterToggle", () => {
    it("switches between unread and all entries", () => {
        renderWithProviders(<FilterToggle />, state)
        expect(screen.getByRole("radio", { name: "Unread" })).toBeChecked()
        expect(screen.getByRole("radio", { name: "All" })).not.toBeChecked()
    })

    it("can take the full width, as tabs on phones", () => {
        const { container } = renderWithProviders(<FilterToggle fullWidth />, state)
        expect(container.querySelector(".cf-filter-toggle")).toHaveAttribute("data-full-width", "true")
    })
})
