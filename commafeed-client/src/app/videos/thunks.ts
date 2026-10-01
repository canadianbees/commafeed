import { createAppAsyncThunk } from "@/app/async-thunk"
import { client, errorToStrings } from "@/app/client"

export const loadVideoStatus = createAppAsyncThunk(
    "videos/status/load",
    async (entryId: string) => (await client.entry.getVideoStatus(entryId)).data
)

export const loadVideoStatuses = createAppAsyncThunk(
    "videos/statuses/load",
    async (entryIds: string[]) => (await client.entry.getVideoStatuses(entryIds)).data,
    {
        condition: entryIds => entryIds.length > 0,
    }
)

export const requestVideoDownload = createAppAsyncThunk("videos/download", async (entryId: string) => {
    try {
        return (await client.entry.requestVideo(entryId)).data
    } catch (err) {
        // errorToStrings only knows errors returned by the server, e.g. not network errors
        const messages = errorToStrings(err)
        throw new Error(messages.length > 0 ? messages.join(", ") : err instanceof Error && err.message ? err.message : "unknown error")
    }
})
