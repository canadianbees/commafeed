import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { MantineProvider } from "@mantine/core"
import { configureStore } from "@reduxjs/toolkit"
import { render } from "@testing-library/react"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import type { ReactElement, ReactNode } from "react"
import { Provider } from "react-redux"
import { type RootState, reducers } from "@/app/store"

i18n.loadAndActivate({ locale: "en", messages: {} })
// registered in main.tsx for the app
dayjs.extend(relativeTime)

/** Renders a component with the redux store, i18n and mantine providers used by the app. */
export const renderWithProviders = (ui: ReactElement, preloadedState?: Partial<RootState>) => {
    const store = configureStore({ reducer: reducers, preloadedState: preloadedState as RootState | undefined })
    const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider store={store}>
            <I18nProvider i18n={i18n}>
                <MantineProvider>{children}</MantineProvider>
            </I18nProvider>
        </Provider>
    )
    return { store, ...render(ui, { wrapper }) }
}
