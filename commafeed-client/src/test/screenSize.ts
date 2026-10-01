import { vi } from "vitest"

/**
 * Makes the app see a desktop or a phone screen: min-width media queries match on desktop only.
 * Returns a function restoring the default stub of the test setup.
 */
export const stubScreenSize = (size: "desktop" | "phone") => {
    const original = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: size === "desktop" && query.includes("min-width"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }))
    return () => {
        window.matchMedia = original
    }
}
