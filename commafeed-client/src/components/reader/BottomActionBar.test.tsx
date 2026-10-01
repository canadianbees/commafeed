import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BottomActionBar } from "@/components/reader/BottomActionBar"
import { renderWithProviders } from "@/test/renderWithProviders"

describe("BottomActionBar", () => {
    it("shows its actions", () => {
        renderWithProviders(
            <BottomActionBar>
                <button type="button">Mark all read</button>
            </BottomActionBar>
        )
        expect(screen.getByRole("button", { name: "Mark all read" }).closest(".cf-bottom-action-bar")).not.toBeNull()
    })
})
