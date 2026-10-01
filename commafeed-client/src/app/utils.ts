import { throttle } from "throttle-debounce"
import type { TreeCategory } from "@/app/tree/slice"
import type { Category } from "./types"

export function visitCategoryTree(
    category: TreeCategory,
    visitor: (category: TreeCategory) => void,
    options?: {
        childrenFirst?: boolean
    }
): void {
    const childrenFirst = options?.childrenFirst

    if (!childrenFirst) visitor(category)

    for (const child of category.children) {
        visitCategoryTree(child, visitor, options)
    }

    if (childrenFirst) visitor(category)
}

export function flattenCategoryTree(category: TreeCategory): TreeCategory[] {
    const categories: Category[] = []
    visitCategoryTree(category, c => categories.push(c))
    return categories
}

export function categoryUnreadCount(category?: TreeCategory): number {
    if (!category) return 0

    return flattenCategoryTree(category)
        .flatMap(c => c.feeds)
        .map(f => f.unread)
        .reduce((total, current) => total + current, 0)
}

export function categoryHasNewEntries(category?: TreeCategory): boolean {
    if (!category) return false

    return flattenCategoryTree(category)
        .flatMap(c => c.feeds)
        .some(f => f.hasNewEntries)
}

export const calculatePlaceholderSize = ({ width, height, maxWidth }: { width?: number; height?: number; maxWidth: number }) => {
    const placeholderWidth = width && Math.min(width, maxWidth)
    const placeholderHeight = height && width && width > maxWidth ? height * (maxWidth / width) : height
    return { width: placeholderWidth, height: placeholderHeight }
}

export const scrollToWithCallback = ({ options, onScrollEnded }: { options: ScrollToOptions; onScrollEnded: () => void }) => {
    const offset = (options.top ?? 0).toFixed()

    const onScroll = throttle(100, () => {
        if (window.scrollY.toFixed() === offset) {
            window.removeEventListener("scroll", onScroll)
            onScrollEnded()
        }
    })
    window.addEventListener("scroll", onScroll)

    // scrollTo does not trigger if there's nothing to do, trigger it manually
    onScroll()

    window.scrollTo(options)
}

export const truncate = (str: string, n: number) => (str.length > n ? `${str.slice(0, n - 1)}\u2026` : str)

/** Human readable size, e.g. "328 MB". */
export const formatBytes = (bytes: number) => {
    const units = ["B", "KB", "MB", "GB", "TB"]
    let value = bytes
    let unit = 0
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024
        unit++
    }
    return `${value.toFixed(unit < 2 ? 0 : 1).replace(/\.0$/, "")} ${units[unit]}`
}

/** Video length, e.g. "25:31" or "1:02:15". */
export const formatDuration = (totalSeconds: number) => {
    const seconds = Math.floor(totalSeconds % 60)
    const minutes = Math.floor((totalSeconds / 60) % 60)
    const hours = Math.floor(totalSeconds / 3600)
    const pad = (n: number) => String(n).padStart(2, "0")
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}
