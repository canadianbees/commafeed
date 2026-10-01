import { afterEach, describe, expect, it, vi } from "vitest"
import { getScrollContainer, isReadingPaneDisplayed, registerScrollContainer, scrollReadingPane } from "@/app/scrollContainers"

const pane = (scrollTop: number, clientHeight: number, scrollHeight: number) => {
    const element = document.createElement("div")
    Object.defineProperties(element, {
        scrollTop: { value: scrollTop },
        clientHeight: { value: clientHeight },
        scrollHeight: { value: scrollHeight },
    })
    element.scrollBy = vi.fn()
    return element
}

describe("scrollContainers", () => {
    afterEach(() => {
        registerScrollContainer("entries", null)
        registerScrollContainer("readingPane", null)
    })

    it("registers and unregisters containers", () => {
        const element = document.createElement("div")
        registerScrollContainer("entries", element)
        expect(getScrollContainer("entries")).toBe(element)

        registerScrollContainer("entries", null)
        expect(getScrollContainer("entries")).toBeUndefined()
    })

    it("knows when the reading pane is displayed", () => {
        expect(isReadingPaneDisplayed()).toBe(false)
        registerScrollContainer("readingPane", document.createElement("div"))
        expect(isReadingPaneDisplayed()).toBe(true)
    })

    it("scrolls the reading pane down by most of its height", () => {
        const element = pane(0, 500, 2000)
        registerScrollContainer("readingPane", element)
        expect(scrollReadingPane("down")).toBe(true)
        expect(element.scrollBy).toHaveBeenCalledWith({ top: 400, behavior: "smooth" })
    })

    it("does not scroll past the bottom or the top", () => {
        registerScrollContainer("readingPane", pane(1500, 500, 2000))
        expect(scrollReadingPane("down")).toBe(false)

        registerScrollContainer("readingPane", pane(0, 500, 2000))
        expect(scrollReadingPane("up")).toBe(false)
    })

    it("does nothing when the reading pane is not displayed", () => {
        expect(scrollReadingPane("down")).toBe(false)
    })
})
