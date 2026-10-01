import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SectionTitle } from "@/components/reader/SectionTitle"
import { renderWithProviders } from "@/test/renderWithProviders"

describe("SectionTitle", () => {
    it("renders the title with the custom css class", () => {
        const { container } = renderWithProviders(<SectionTitle>All entries</SectionTitle>)
        expect(screen.getByRole("heading", { name: "All entries" })).toBeInTheDocument()
        expect(container.querySelector(".cf-entries-title")).not.toBeNull()
    })

    it("renders actions next to the title", () => {
        renderWithProviders(<SectionTitle actions={<button type="button">Edit</button>}>Tech</SectionTitle>)
        expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument()
    })
})
