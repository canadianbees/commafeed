import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { VideoDownloadStatus } from "@/app/types"
import { loadVideoStatus, loadVideoStatuses, requestVideoDownload } from "./thunks"

interface VideosState {
    /** download status of the video of each entry, by entry id */
    statuses: Record<string, VideoDownloadStatus>
    /** error returned when requesting a download, by entry id */
    requestErrors: Record<string, string>
    /** theater mode: the selected video takes most of the screen, the entry list and the sidebar are collapsed */
    theater: boolean
    /** downloaded videos that are taller than wide, by entry id: shown like short videos on phones */
    vertical: Record<string, true>
}

const initialState: VideosState = {
    statuses: {},
    requestErrors: {},
    theater: false,
    vertical: {},
}

export const isVideoDownloadInProgress = (status?: VideoDownloadStatus) => status?.status === "QUEUED" || status?.status === "DOWNLOADING"

export const videosSlice = createSlice({
    name: "videos",
    initialState,
    reducers: {
        setTheater: (state, action: PayloadAction<boolean>) => {
            state.theater = action.payload
        },
        setVideoVertical: (state, action: PayloadAction<string>) => {
            state.vertical[action.payload] = true
        },
    },
    extraReducers: builder => {
        builder.addCase(loadVideoStatus.fulfilled, (state, action) => {
            state.statuses[action.meta.arg] = action.payload
        })
        builder.addCase(loadVideoStatus.rejected, (state, action) => {
            // keep polling a download in progress, the error may be temporary
            if (!state.statuses[action.meta.arg]) {
                state.statuses[action.meta.arg] = { status: "NONE" }
            }
        })
        builder.addCase(loadVideoStatuses.fulfilled, (state, action) => {
            Object.assign(state.statuses, action.payload)
        })
        builder.addCase(requestVideoDownload.pending, (state, action) => {
            delete state.requestErrors[action.meta.arg]
        })
        builder.addCase(requestVideoDownload.fulfilled, (state, action) => {
            state.statuses[action.meta.arg] = action.payload
        })
        builder.addCase(requestVideoDownload.rejected, (state, action) => {
            state.requestErrors[action.meta.arg] = action.error.message || "unknown error"
        })
    },
})

export const { setTheater, setVideoVertical } = videosSlice.actions
