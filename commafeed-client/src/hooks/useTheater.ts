import { useAppSelector } from "@/app/store"
import { useReadingPane } from "@/hooks/useReadingPane"

/**
 * Whether theater mode is displayed: turned on, in the reading pane layout, with a downloadable video selected.
 */
export const useTheater = () => {
    const theater = useAppSelector(state => state.videos.theater)
    const readingPane = useReadingPane()
    const videoDownloadEnabled = useAppSelector(state => state.server.serverInfos?.videoDownloadEnabled)
    const videoSelected = useAppSelector(
        state => !!state.entries.entries.find(e => e.id === state.entries.selectedEntryId)?.downloadableVideo
    )
    return theater && readingPane && !!videoDownloadEnabled && videoSelected
}
