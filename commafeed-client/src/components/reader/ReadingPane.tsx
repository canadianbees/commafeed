import { Trans } from "@lingui/react/macro"
import { Box, Center, Group, Stack, Text, Title } from "@mantine/core"
import { type ReactNode, useState } from "react"
import { useAppDispatch, useAppSelector } from "@/app/store"
import type { Entry } from "@/app/types"
import { setVideoVertical } from "@/app/videos/slice"
import { DownloadableVideo } from "@/components/content/DownloadableVideo"
import { FeedEntryBody } from "@/components/content/FeedEntryBody"
import { FeedEntryFooter } from "@/components/content/FeedEntryFooter"
import { useTheater } from "@/hooks/useTheater"
import { useVideoInfo } from "@/hooks/useVideoInfo"
import { useVideoPositionSaving } from "@/hooks/useVideoPositionSaving"
import { cf } from "@/theme/tokens"
import { tss } from "@/tss"
import { cleanVideoDescription } from "./cleanVideoDescription"
import { EntrySubtitle } from "./EntrySubtitle"
import { TheaterToggle } from "./TheaterToggle"
import { VideoChapters } from "./VideoChapters"
import { VideoDescription } from "./VideoDescription"
import { VideoDetails } from "./VideoDetails"

const useStyles = tss
    .withParams<{ fontSizePercentage: number; rtl: boolean; compact: boolean }>()
    .create(({ fontSizePercentage, rtl, compact }) => ({
        toolbar: {
            position: "sticky",
            top: 0,
            zIndex: 1,
            padding: compact ? "4px 10px" : "8px 32px",
            background: cf("surface"),
            borderBottom: `1px solid ${cf("border")}`,
        },
        video: {
            maxWidth: 960,
            margin: "0 auto",
            padding: compact ? "12px 12px 60px" : "28px 32px 80px",
            color: cf("text"),
            direction: rtl ? "rtl" : "ltr",
        },
        stickyPlayer: {
            // phones: the player stays at the top while scrolling the chapters and the description
            position: "sticky",
            top: 0,
            zIndex: 2,
            margin: "-12px -12px 0",
            background: "#0a0a0a",
        },
        theater: {
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 320px",
            gap: 28,
            padding: "24px 32px 80px",
            color: cf("text"),
            direction: rtl ? "rtl" : "ltr",
            "@media (max-width: 1280px)": {
                gridTemplateColumns: "minmax(0, 1fr)",
            },
        },
        theaterSide: {
            position: "sticky",
            top: 72,
            alignSelf: "start",
        },
        videoTitle: {
            fontSize: compact ? 24 : 30,
            lineHeight: 1.2,
            fontWeight: 700,
        },
        article: {
            maxWidth: 680,
            margin: "0 auto",
            padding: compact ? "20px 16px 60px" : "40px 32px 80px",
            color: cf("text"),
            direction: rtl ? "rtl" : "ltr",
        },
        title: {
            fontSize: compact ? 26 : 34,
            lineHeight: 1.15,
            fontWeight: 700,
            letterSpacing: "-0.01em",
        },
        titleLink: {
            color: "inherit",
            textDecoration: "none",
            "&:hover": {
                color: cf("accent-text"),
            },
        },
        content: {
            fontSize: `${fontSizePercentage}%`,
            lineHeight: 1.75,
            "& a": {
                color: cf("accent-text"),
            },
        },
        empty: {
            height: "100%",
            color: cf("text-muted"),
        },
    }))

/** A video entry: the player first, then what the video is about. In theater mode, the chapters are on the side. */
function VideoEntry(
    props: Readonly<{
        entry: Entry
        title: ReactNode
        search?: string
        compact: boolean
        /** phones: the entry actions, shown under the video details */
        toolbar?: ReactNode
    }>
) {
    const fontSizePercentage = useAppSelector(state => state.user.localSettings.fontSizePercentage)
    const { classes, cx } = useStyles({ fontSizePercentage, rtl: !!props.entry.rtl, compact: props.compact })
    const theater = useTheater()
    const { info, loading } = useVideoInfo(props.entry.id)
    const [video, setVideo] = useState<HTMLVideoElement | null>(null)
    useVideoPositionSaving(props.entry.id, video, props.entry.videoPosition)
    const dispatch = useAppDispatch()
    // once downloaded, the player has its own theater mode button
    const downloaded = useAppSelector(state => state.videos.statuses[props.entry.id]?.status === "DONE")
    const feedDescription = cleanVideoDescription(props.entry.content || props.entry.mediaDescription)
    const chapters = info?.chapters ?? []

    const player = (
        <DownloadableVideo
            entryId={props.entry.id}
            variant="frame"
            videoRef={setVideo}
            chapters={chapters}
            // theater mode is for desktop screens
            theaterToggle={!props.compact}
            resumeAt={props.entry.videoPosition}
            onVideoSize={(width, height) => {
                // vertical videos are shown like short videos on phones
                if (height > width) dispatch(setVideoVertical(props.entry.id))
            }}
        />
    )
    const heading = (
        <>
            <EntrySubtitle entry={props.entry} size="md" />
            <Title order={1} className={cx("cf-header-title", classes.videoTitle)}>
                {props.title}
            </Title>
        </>
    )
    const videoDetails = <VideoDetails entryId={props.entry.id} duration={info?.duration} position={props.entry.videoPosition} />
    const description = (
        <Box className={classes.content}>
            <VideoDescription description={info?.description} loading={loading} feedDescription={feedDescription} search={props.search} />
        </Box>
    )

    if (props.compact) {
        // phones: the player stays at the top, the chapters are listed under the details
        return (
            <Stack component="article" gap="md" className={cx("cf-phone-video", classes.video)}>
                <Box className={classes.stickyPlayer}>{player}</Box>
                {heading}
                {videoDetails}
                {props.toolbar}
                {chapters.length > 0 && <VideoChapters chapters={chapters} duration={info?.duration} video={video} />}
                {description}
            </Stack>
        )
    }

    const details = (
        <>
            {player}
            {heading}
            <Group justify="space-between" gap="xs">
                {videoDetails}
                {!downloaded && <TheaterToggle />}
            </Group>
            {description}
        </>
    )

    if (theater) {
        return (
            <Box component="article" className={cx("cf-theater", classes.theater)}>
                <Stack gap="md" style={{ minWidth: 0 }}>
                    {details}
                </Stack>
                {chapters.length > 0 && (
                    <Box className={classes.theaterSide}>
                        <VideoChapters chapters={chapters} duration={info?.duration} video={video} />
                    </Box>
                )}
            </Box>
        )
    }

    return (
        <Stack component="article" gap="md" className={classes.video}>
            {details}
        </Stack>
    )
}

/** Shows the selected entry next to the entry list, with its actions at the top. */
export function ReadingPane(
    props: Readonly<{
        entry?: Entry
        /** smaller spacing and titles, for phones */
        compact?: boolean
    }>
) {
    const fontSizePercentage = useAppSelector(state => state.user.localSettings.fontSizePercentage)
    const videoDownloadEnabled = useAppSelector(state => state.server.serverInfos?.videoDownloadEnabled)
    const search = useAppSelector(state => state.entries.search)
    const { classes, cx } = useStyles({ fontSizePercentage, rtl: !!props.entry?.rtl, compact: !!props.compact })

    if (!props.entry) {
        return (
            <Center className={cx("cf-reading-pane-empty", classes.empty)}>
                <Text>
                    <Trans>Select an entry to read it here.</Trans>
                </Text>
            </Center>
        )
    }

    const entry = props.entry
    const toolbar = (
        <Box className={classes.toolbar}>
            <FeedEntryFooter entry={entry} />
        </Box>
    )
    const title = (
        <a href={entry.url} target="_blank" rel="noreferrer" className={classes.titleLink}>
            {entry.title}
        </a>
    )

    if (videoDownloadEnabled && entry.downloadableVideo) {
        return (
            <Box className="cf-reading-pane-entry cf-reading-pane-video" data-id={entry.id}>
                {/* phones: the player sticks to the top, the actions go under the video details */}
                {!props.compact && toolbar}
                <VideoEntry
                    entry={entry}
                    title={title}
                    search={search}
                    compact={!!props.compact}
                    toolbar={
                        props.compact ? (
                            <Box className="cf-phone-video-actions">
                                <FeedEntryFooter entry={entry} />
                            </Box>
                        ) : undefined
                    }
                />
            </Box>
        )
    }

    return (
        <Box className="cf-reading-pane-entry" data-id={entry.id}>
            {toolbar}
            <Stack component="article" gap="md" className={classes.article}>
                <EntrySubtitle entry={entry} size="md" />
                <Title order={1} className={cx("cf-header-title", classes.title)}>
                    {title}
                </Title>
                {entry.author && (
                    <Text size="sm" c={cf("text-muted")}>
                        <Trans>by {entry.author}</Trans>
                    </Text>
                )}
                <Box className={cx("cf-content", classes.content)}>
                    <FeedEntryBody entry={entry} />
                </Box>
            </Stack>
        </Box>
    )
}
