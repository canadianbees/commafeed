/**
 * Scrollable elements of the reading pane layout, where the entry list and the selected entry scroll independently.
 * When they are not registered (inline layout), the whole window scrolls.
 */
export type ScrollContainerName = "entries" | "readingPane"

const containers = new Map<ScrollContainerName, HTMLElement>()

export const registerScrollContainer = (name: ScrollContainerName, element: HTMLElement | null) => {
    if (element) containers.set(name, element)
    else containers.delete(name)
}

export const getScrollContainer = (name: ScrollContainerName): HTMLElement | undefined => containers.get(name)

/** Whether the reading pane layout is currently displayed. */
export const isReadingPaneDisplayed = () => containers.has("readingPane")

/** Scrolls the reading pane by a fraction of its height. Returns false when already at the top or bottom. */
export const scrollReadingPane = (direction: "up" | "down"): boolean => {
    const pane = getScrollContainer("readingPane")
    if (!pane) return false

    const atTop = pane.scrollTop <= 0
    const atBottom = pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 1
    if ((direction === "down" && atBottom) || (direction === "up" && atTop)) return false

    const distance = pane.clientHeight * 0.8
    pane.scrollBy({ top: direction === "down" ? distance : -distance, behavior: "smooth" })
    return true
}
