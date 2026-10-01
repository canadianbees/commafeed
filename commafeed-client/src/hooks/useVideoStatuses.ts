import { useEffect } from "react"
import { shallowEqual } from "react-redux"
import { useAppDispatch, useAppSelector } from "@/app/store"
import type { Entry } from "@/app/types"
import { isVideoDownloadInProgress } from "@/app/videos/slice"
import { loadVideoStatuses } from "@/app/videos/thunks"

const POLL_INTERVAL = 1000

/** Refreshes the status of the videos being downloaded, so that every place showing them stays up to date. */
export const useVideoStatusPolling = () => {
    const dispatch = useAppDispatch()
    const inProgress = useAppSelector(
        state =>
            Object.entries(state.videos.statuses)
                .filter(([, status]) => isVideoDownloadInProgress(status))
                .map(([id]) => id),
        shallowEqual
    )

    const ids = inProgress.join(",")
    useEffect(() => {
        if (!ids) return
        const interval = setInterval(() => dispatch(loadVideoStatuses(ids.split(","))), POLL_INTERVAL)
        return () => clearInterval(interval)
    }, [dispatch, ids])
}

/** Loads the download status of the videos among the given entries, once. */
export const useLoadVideoStatuses = (entries: Entry[]) => {
    const dispatch = useAppDispatch()
    const enabled = useAppSelector(state => state.server.serverInfos?.videoDownloadEnabled)
    const known = useAppSelector(state => state.videos.statuses)

    const missing = entries
        .filter(e => e.downloadableVideo && !known[e.id])
        .map(e => e.id)
        .join(",")
    useEffect(() => {
        if (!enabled || !missing) return
        dispatch(loadVideoStatuses(missing.split(",")))
    }, [dispatch, enabled, missing])
}
