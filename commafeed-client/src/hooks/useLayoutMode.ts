import { useAppSelector } from "@/app/store"
import { useMobile } from "@/hooks/useMobile"

/**
 * How entries are displayed:
 * - inline: entries expand inside the list (the original layout)
 * - columns: entry list and reading pane side by side (reading pane layout on desktop)
 * - phone: card list, entries open full screen (reading pane layout on phones)
 */
export type LayoutMode = "inline" | "columns" | "phone"

export const useLayoutMode = (): LayoutMode => {
    const layout = useAppSelector(state => state.user.localSettings.layout)
    const mobile = useMobile()
    if (layout !== "readingPane") return "inline"
    return mobile ? "phone" : "columns"
}
