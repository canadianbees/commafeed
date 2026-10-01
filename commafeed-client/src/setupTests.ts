import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"
import { Constants } from "@/app/constants"

// tests share their modules (isolate: false in vite.config.ts), so a vi.mock of the api client in a single test file
// only works if no other test file loaded the real client before. Mock it for all tests instead: the requests are
// replaced by mocks, the other exports (e.g. errorToStrings) stay real.
vi.mock(import("@/app/client"), async importOriginal => {
    const actual = await importOriginal()
    return { ...actual, client: vi.mockObject(actual.client) }
})

// reduce delay for faster tests
Constants.tooltip.delay = 10

// jsdom doesn't implement ResizeObserver, used by some mantine components (e.g. SegmentedControl)
window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
}

// jsdom doesn't mock matchMedia
// https://stackoverflow.com/a/53449595/
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

// tests are not isolated (see vite.config.ts): unmount rendered components after each test, otherwise queries on the
// whole document find elements left by previous tests
afterEach(() => cleanup())
