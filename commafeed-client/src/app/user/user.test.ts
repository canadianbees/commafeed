import { configureStore } from "@reduxjs/toolkit"
import { describe, expect, it } from "vitest"
import { reducers } from "@/app/store"
import { setLayout, setTheme } from "@/app/user/slice"

describe("user local settings", () => {
    it("defaults to the inline layout and the default theme", () => {
        const store = configureStore({ reducer: reducers })
        expect(store.getState().user.localSettings.layout).toBe("inline")
        expect(store.getState().user.localSettings.theme).toBe("default")
    })

    it("changes the layout and the theme", () => {
        const store = configureStore({ reducer: reducers })
        store.dispatch(setLayout("readingPane"))
        store.dispatch(setTheme("sand"))
        expect(store.getState().user.localSettings.layout).toBe("readingPane")
        expect(store.getState().user.localSettings.theme).toBe("sand")
    })
})
