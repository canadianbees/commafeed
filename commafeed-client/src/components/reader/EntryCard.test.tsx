import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Entry } from "@/app/types"
import { EntryCard, entrySnippet } from "@/components/reader/EntryCard"
import { renderWithProviders } from "@/test/renderWithProviders"

const entry = (overrides: Partial<Entry> = {}): Entry =>
    ({
        id: "1",
        title: "Keeping a small project healthy",
        content: "<p>What changes when <b>strangers</b> depend on your code.</p>",
        url: "https://example.com/1",
        feedName: "Open Source Notes",
        feedId: "2",
        iconUrl: "",
        date: Date.now(),
        read: false,
        starred: false,
        markable: true,
        tags: [],
        downloadableVideo: false,
        ...overrides,
    }) as Entry

describe("EntryCard", () => {
    it("renders feed name, title and a plain text snippet", () => {
        renderWithProviders(<EntryCard entry={entry()} selected={false} onClick={vi.fn()} onRightClick={vi.fn()} />)
        expect(screen.getByText("Open Source Notes")).toBeInTheDocument()
        expect(screen.getByText("Keeping a small project healthy")).toBeInTheDocument()
        expect(screen.getByText("What changes when strangers depend on your code.")).toBeInTheDocument()
    })

    it("marks the selected and unread states", () => {
        const { container } = renderWithProviders(<EntryCard entry={entry()} selected={true} onClick={vi.fn()} onRightClick={vi.fn()} />)
        const card = container.querySelector("article")
        expect(card).toHaveClass("cf-entry-card", "unread", "selected")
        expect(card).toHaveAttribute("id", "entry-id-1")
    })

    it("shows the video chip instead of the snippet for videos", () => {
        renderWithProviders(
            <EntryCard entry={entry({ downloadableVideo: true })} selected={false} onClick={vi.fn()} onRightClick={vi.fn()} />
        )
        expect(screen.getByText("Video")).toBeInTheDocument()
        expect(screen.queryByText("What changes when strangers depend on your code.")).toBeNull()
    })

    it("shows where the video was stopped", () => {
        renderWithProviders(
            <EntryCard
                entry={entry({ downloadableVideo: true, videoPosition: 3735 })}
                selected={false}
                onClick={vi.fn()}
                onRightClick={vi.fn()}
            />
        )
        expect(screen.getByText("Stopped at 1:02:15")).toBeInTheDocument()
    })

    it("calls onClick when clicked", () => {
        const onClick = vi.fn()
        renderWithProviders(<EntryCard entry={entry()} selected={false} onClick={onClick} onRightClick={vi.fn()} />)
        fireEvent.click(screen.getByText("Keeping a small project healthy"))
        expect(onClick).toHaveBeenCalledOnce()
    })

    it("marks unread entries with the accent edge when asked", () => {
        const { container } = renderWithProviders(
            <>
                <EntryCard entry={entry()} selected={false} onClick={vi.fn()} onRightClick={vi.fn()} unreadEdge />
                <EntryCard entry={entry({ id: "2", read: true })} selected={false} onClick={vi.fn()} onRightClick={vi.fn()} unreadEdge />
            </>
        )
        const [unread, read] = Array.from(container.querySelectorAll("article"))
        expect(unread).toHaveAttribute("data-accent-edge", "true")
        expect(read).not.toHaveAttribute("data-accent-edge")
    })

    it("can be swiped to the left", () => {
        const onSwipedLeft = vi.fn()
        const { container } = renderWithProviders(
            <EntryCard entry={entry()} selected={false} onClick={vi.fn()} onRightClick={vi.fn()} onSwipedLeft={onSwipedLeft} />
        )
        const card = container.querySelector("article") as Element

        fireEvent.touchStart(card, { touches: [{ clientX: 300, clientY: 100 }] })
        fireEvent.touchMove(card, { touches: [{ clientX: 150, clientY: 100 }] })
        fireEvent.touchEnd(card, { touches: [] })

        expect(onSwipedLeft).toHaveBeenCalledOnce()
    })

    it("truncates long snippets", () => {
        const snippet = entrySnippet(entry({ content: `<p>${"word ".repeat(100)}</p>` }))
        expect(snippet.length).toBe(160)
        expect(snippet.endsWith("…")).toBe(true)
    })
})
