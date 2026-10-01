import { useLayoutMode } from "@/hooks/useLayoutMode"

/** Whether entries are shown in the reading pane next to the list: the reading pane layout on desktop. */
export const useReadingPane = () => useLayoutMode() === "columns"
