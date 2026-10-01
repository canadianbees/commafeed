import { Box } from "@mantine/core"
import { useAppSelector } from "@/app/store"
import type { Entry } from "@/app/types"
import { Content } from "./Content"
import { DownloadableVideo } from "./DownloadableVideo"
import { Enclosure } from "./Enclosure"
import { Media } from "./Media"

export interface FeedEntryBodyProps {
    entry: Entry
}

export function FeedEntryBody(props: Readonly<FeedEntryBodyProps>) {
    const search = useAppSelector(state => state.entries.search)
    const videoDownloadEnabled = useAppSelector(state => state.server.serverInfos?.videoDownloadEnabled)
    // thumbnails of downloadable videos are hidden, the video itself can be downloaded and played instead
    const thumbnailUrl = props.entry.downloadableVideo ? undefined : props.entry.mediaThumbnailUrl
    return (
        <Box>
            <Box>
                <Content content={props.entry.content} highlight={search} />
            </Box>
            {props.entry.enclosureType && props.entry.enclosureUrl && (
                <Box pt="md">
                    <Enclosure enclosureType={props.entry.enclosureType} enclosureUrl={props.entry.enclosureUrl} />
                </Box>
            )}
            {videoDownloadEnabled && props.entry.downloadableVideo && (
                <Box pt="md">
                    <DownloadableVideo entryId={props.entry.id} />
                </Box>
            )}
            {/* show media only if we don't have content to avoid duplicate content */}
            {!props.entry.content && props.entry.mediaThumbnailUrl && (
                <Box pt="md">
                    <Media
                        thumbnailUrl={thumbnailUrl}
                        thumbnailWidth={props.entry.mediaThumbnailWidth}
                        thumbnailHeight={props.entry.mediaThumbnailHeight}
                        description={props.entry.mediaDescription}
                    />
                </Box>
            )}
        </Box>
    )
}
