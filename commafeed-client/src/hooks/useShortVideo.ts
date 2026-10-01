import { useAppSelector } from "@/app/store"
import type { Entry } from "@/app/types"
import { isShortVideoUrl } from "@/components/reader/shortVideo"

/** Whether the entry is a short, vertical video: shown in the TikTok-style viewer on phones. */
export const useShortVideo = (entry?: Entry) => {
    const vertical = useAppSelector(state => (entry ? !!state.videos.vertical[entry.id] : false))
    return !!entry?.downloadableVideo && (isShortVideoUrl(entry.url) || vertical)
}
