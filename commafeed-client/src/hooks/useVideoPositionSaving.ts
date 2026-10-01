import { useEffect, useRef } from "react"
import { client } from "@/app/client"
import { setEntryVideoPosition } from "@/app/entries/slice"
import { useAppDispatch } from "@/app/store"

export const SAVE_INTERVAL = 15_000
/** positions at the very beginning are not worth resuming */
export const MIN_POSITION = 5

/**
 * Saves where the user stopped watching the video of the entry, so that it can be resumed later on any device.
 * Saved while playing, on pause and seek, when leaving the entry or the page. Cleared when the video ends.
 */
export const useVideoPositionSaving = (entryId: string, video: HTMLVideoElement | null, savedPosition?: number) => {
    const dispatch = useAppDispatch()
    const lastSaved = useRef<number | null | undefined>(undefined)

    // start from what the server already has, to only send changes
    // biome-ignore lint/correctness/useExhaustiveDependencies: only when switching entries, later changes come from this hook
    useEffect(() => {
        lastSaved.current = savedPosition === undefined ? null : Math.floor(savedPosition)
    }, [entryId])

    useEffect(() => {
        if (!video) return

        const save = (position: number | null, onExit = false) => {
            const value = position !== null && position >= MIN_POSITION ? Math.floor(position) : null
            if (value === lastSaved.current) return
            lastSaved.current = value

            dispatch(setEntryVideoPosition({ id: entryId, position: value ?? undefined }))
            if (onExit) {
                client.entry.saveVideoPositionOnExit(entryId, value)
            } else {
                client.entry.saveVideoPosition(entryId, value).catch(() => {
                    // saved again later: while playing, on pause or when leaving
                    lastSaved.current = undefined
                })
            }
        }

        const onPause = () => {
            // the end of the video is handled by onEnded
            if (!video.ended) save(video.currentTime)
        }
        const onSeeked = () => save(video.currentTime)
        const onEnded = () => save(null)
        const onPageHide = () => {
            if (!video.ended) save(video.currentTime, true)
        }
        const interval = window.setInterval(() => {
            if (!video.paused) save(video.currentTime)
        }, SAVE_INTERVAL)

        video.addEventListener("pause", onPause)
        video.addEventListener("seeked", onSeeked)
        video.addEventListener("ended", onEnded)
        window.addEventListener("pagehide", onPageHide)
        return () => {
            window.clearInterval(interval)
            video.removeEventListener("pause", onPause)
            video.removeEventListener("seeked", onSeeked)
            video.removeEventListener("ended", onEnded)
            window.removeEventListener("pagehide", onPageHide)
            // leaving the entry: keep where the video was stopped, if it was played at all
            if (!video.ended && video.currentTime > 0) save(video.currentTime, true)
        }
    }, [dispatch, entryId, video])
}
