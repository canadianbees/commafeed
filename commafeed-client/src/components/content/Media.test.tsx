import { MantineProvider } from "@mantine/core"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Media } from "@/components/content/Media"

describe("Media component", () => {
    it("renders thumbnail and description", () => {
        const { container } = render(<Media thumbnailUrl="https://example.com/thumb.jpg" description="Video description" />, {
            wrapper: MantineProvider,
        })
        expect(container.querySelector("img")).toHaveAttribute("src", "https://example.com/thumb.jpg")
        expect(container).toHaveTextContent("Video description")
    })

    it("renders only the description without a thumbnail", () => {
        const { container } = render(<Media description="Video description" />, { wrapper: MantineProvider })
        expect(container.querySelector("img")).toBeNull()
        expect(container).toHaveTextContent("Video description")
    })
})
