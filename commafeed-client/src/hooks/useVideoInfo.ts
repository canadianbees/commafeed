import { useEffect, useState } from "react"
import { client } from "@/app/client"
import type { VideoInfo } from "@/app/types"

/** Details of the video of an entry (description, duration, chapters), read from the video site by the server. */
export const useVideoInfo = (entryId: string) => {
    const [info, setInfo] = useState<VideoInfo>()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        setInfo(undefined)
        setLoading(true)
        client.entry
            .getVideoInfo(entryId)
            .then(r => !cancelled && setInfo(r.data || undefined))
            .catch(() => {
                // the details are optional, the feed's description is shown instead
            })
            .finally(() => !cancelled && setLoading(false))
        return () => {
            cancelled = true
        }
    }, [entryId])

    return { info, loading }
}
