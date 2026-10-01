import { fireEvent, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { client } from "@/app/client"
import type { RootState } from "@/app/store"
import type { VideoDownloadStatus } from "@/app/types"
import { DownloadableVideo } from "@/components/content/DownloadableVideo"
import { renderWithProviders } from "@/test/renderWithProviders"

const response = <T,>(data: T) => ({ data }) as never

const withStatus = (status: VideoDownloadStatus) =>
    ({ videos: { statuses: { "1": status }, requestErrors: {}, theater: false } }) as unknown as Partial<RootState>

describe("DownloadableVideo component", () => {
    beforeEach(() => {
        // clear, not reset: resetting would also remove the matchMedia stub of the test setup
        vi.clearAllMocks()
    })

    it("loads the status and shows a download button when the video is not downloaded", async () => {
        vi.mocked(client.entry.getVideoStatus).mockResolvedValue(response({ status: "NONE" }))
        renderWithProviders(<DownloadableVideo entryId="1" />)
        expect(await screen.findByText("Download video")).toBeInTheDocument()
        expect(client.entry.getVideoStatus).toHaveBeenCalledWith("1")
    })

    it("shows the player when the video is downloaded", () => {
        const { container } = renderWithProviders(<DownloadableVideo entryId="1" />, withStatus({ status: "DONE" }))
        expect(container.querySelector("video source")).toHaveAttribute("src", "rest/entry/video/1")
    })

    it("requests the download and shows progress", async () => {
        vi.mocked(client.entry.requestVideo).mockResolvedValue(response({ status: "QUEUED" }))
        renderWithProviders(<DownloadableVideo entryId="1" />, withStatus({ status: "NONE" }))

        fireEvent.click(screen.getByText("Download video"))

        expect(client.entry.requestVideo).toHaveBeenCalledWith("1")
        expect(await screen.findByText("Waiting to download…")).toBeInTheDocument()
    })

    it("shows the download progress", () => {
        renderWithProviders(
            <DownloadableVideo entryId="1" />,
            withStatus({ status: "DOWNLOADING", stage: "VIDEO", progress: 42.7, speed: 2 * 1024 * 1024, eta: 75 })
        )
        expect(screen.getByText("Downloading video…")).toBeInTheDocument()
        expect(screen.getByText("42% · 2.0 MB/s · 1:15")).toBeInTheDocument()
    })

    it("shows the error and a retry button when the download failed", () => {
        renderWithProviders(<DownloadableVideo entryId="1" />, withStatus({ status: "FAILED", error: "ERROR: Private video" }))
        expect(screen.getByText("ERROR: Private video")).toBeInTheDocument()
        expect(screen.getByText("Retry")).toBeInTheDocument()
    })

    it("shows the error of a download request", async () => {
        vi.mocked(client.entry.requestVideo).mockRejectedValue(new Error("network down"))
        renderWithProviders(<DownloadableVideo entryId="1" />, withStatus({ status: "NONE" }))

        fireEvent.click(screen.getByText("Download video"))

        await waitFor(() => expect(screen.getByText("Retry")).toBeInTheDocument())
    })

    it("shows everything inside the player frame in the frame variant", () => {
        const { container } = renderWithProviders(<DownloadableVideo entryId="1" variant="frame" />, withStatus({ status: "NONE" }))
        expect(container.querySelector(".cf-video-frame")).toContainElement(screen.getByText("Download video"))
    })
})
