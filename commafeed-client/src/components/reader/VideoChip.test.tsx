import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { VideoChip } from "@/components/reader/VideoChip"
import { renderWithProviders } from "@/test/renderWithProviders"

describe("VideoChip", () => {
    it("shows a video that is not downloaded", () => {
        renderWithProviders(<VideoChip status={{ status: "NONE" }} />)
        expect(screen.getByText("Video")).toBeInTheDocument()
    })

    it("shows a downloaded video", () => {
        renderWithProviders(<VideoChip status={{ status: "DONE" }} />)
        expect(screen.getByText("Video · Downloaded")).toBeInTheDocument()
    })

    it("shows the progress of a download", () => {
        renderWithProviders(<VideoChip status={{ status: "DOWNLOADING", stage: "VIDEO", progress: 42.7 }} />)
        expect(screen.getByText("Downloading video… 42%")).toBeInTheDocument()
        expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "42")
    })

    it("shows a failed download", () => {
        renderWithProviders(<VideoChip status={{ status: "FAILED", error: "private" }} />)
        expect(screen.getByText("Video · Download failed")).toBeInTheDocument()
    })
})
