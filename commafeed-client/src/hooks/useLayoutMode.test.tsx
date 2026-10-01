import { configureStore } from "@reduxjs/toolkit"
import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { Provider } from "react-redux"
import { afterEach, describe, expect, it } from "vitest"
import { type RootState, reducers } from "@/app/store"
import type { Layout } from "@/app/types"
import { initialLocalSettings } from "@/app/user/slice"
import { useLayoutMode } from "@/hooks/useLayoutMode"
import { stubScreenSize } from "@/test/screenSize"

const layoutMode = (layout: Layout) => {
    const store = configureStore({
        reducer: reducers,
        preloadedState: { user: { localSettings: { ...initialLocalSettings, layout } } } as unknown as RootState,
    })
    const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>
    return renderHook(() => useLayoutMode(), { wrapper }).result.current
}

describe("useLayoutMode", () => {
    let restore = () => {}
    afterEach(() => restore())

    it("keeps the inline layout by default, on any screen", () => {
        restore = stubScreenSize("desktop")
        expect(layoutMode("inline")).toBe("inline")
        restore()
        restore = stubScreenSize("phone")
        expect(layoutMode("inline")).toBe("inline")
    })

    it("uses columns for the reading pane layout on desktop", () => {
        restore = stubScreenSize("desktop")
        expect(layoutMode("readingPane")).toBe("columns")
    })

    it("uses the phone layout for the reading pane layout on phones", () => {
        restore = stubScreenSize("phone")
        expect(layoutMode("readingPane")).toBe("phone")
    })
})
