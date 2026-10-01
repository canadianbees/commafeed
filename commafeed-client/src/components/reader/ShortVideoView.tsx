import { msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import { Trans } from "@lingui/react/macro"
import { ActionIcon, Box, Button, Group, Popover, Stack, Text, UnstyledButton } from "@mantine/core"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
    TbChevronLeft,
    TbExternalLink,
    TbPlayerPlayFilled,
    TbPlayerTrackNextFilled,
    TbRefresh,
    TbShare,
    TbStar,
    TbStarFilled,
    TbVolume3,
} from "react-icons/tb"
import { useSwipeable } from "react-swipeable"
import { selectAdjacentVideo, starEntry } from "@/app/entries/thunks"
import { useAppDispatch, useAppSelector } from "@/app/store"
import type { Entry } from "@/app/types"
import { formatDuration } from "@/app/utils"
import { isVideoDownloadInProgress } from "@/app/videos/slice"
import { loadVideoStatus, requestVideoDownload } from "@/app/videos/thunks"
import { DownloadProgress } from "@/components/content/DownloadableVideo"
import { FeedFavicon } from "@/components/content/FeedFavicon"
import { ShareButtons } from "@/components/content/ShareButtons"
import { useVideoInfo } from "@/hooks/useVideoInfo"
import { cf } from "@/theme/tokens"
import { tss } from "@/tss"
import { cleanVideoDescription } from "./cleanVideoDescription"
import { LinkifiedText } from "./VideoDescription"
import { VIDEO_FRAME_BACKGROUND, VIDEO_FRAME_TEXT } from "./VideoFrame"
import { SeekBar, usePlayerState } from "./VideoPlayer"

const SWIPE_DELTA = 50

const useStyles = tss.create(() => ({
    root: {
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: VIDEO_FRAME_BACKGROUND,
        color: VIDEO_FRAME_TEXT,
    },
    bar: {
        height: 56,
        flexShrink: 0,
        padding: "0 8px 0 6px",
        borderBottom: `2px solid ${cf("header-border")}`,
    },
    iconButton: {
        width: 44,
        height: 44,
        color: VIDEO_FRAME_TEXT,
    },
    feedName: {
        flexGrow: 1,
        minWidth: 0,
        fontSize: 14,
        fontWeight: 600,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    chip: {
        height: 24,
        padding: "0 8px",
        display: "inline-flex",
        alignItems: "center",
        borderRadius: cf("radius"),
        background: cf("video"),
        color: cf("on-video"),
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
    },
    stage: {
        position: "relative",
        flexGrow: 1,
        minHeight: 0,
        overflow: "hidden",
        // vertical swipes change the video, the browser must not scroll or refresh the page
        touchAction: "none",
    },
    video: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
        background: "#000",
    },
    center: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    playIndicator: {
        width: 64,
        height: 64,
        borderRadius: 32,
        border: `2px solid ${cf("header-border")}`,
        background: "rgba(10, 10, 10, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
    },
    unmute: {
        position: "absolute",
        top: 14,
        left: "50%",
        transform: "translateX(-50%)",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 32,
        padding: "0 12px",
        borderRadius: 16,
        background: "rgba(10, 10, 10, 0.75)",
        border: `1px solid ${cf("header-border")}`,
        color: VIDEO_FRAME_TEXT,
        fontSize: 13,
        fontWeight: 600,
    },
    rail: {
        position: "absolute",
        right: 12,
        bottom: 24,
        display: "flex",
        flexDirection: "column",
        gap: 14,
    },
    railButton: {
        width: 48,
        height: 48,
        borderRadius: cf("radius"),
        border: `1px solid ${cf("header-border")}`,
        background: "rgba(10, 10, 10, 0.6)",
        color: VIDEO_FRAME_TEXT,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
    },
    caption: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        padding: "48px 76px 16px 16px",
        background: "linear-gradient(to top, rgba(10, 10, 10, 0.85), rgba(10, 10, 10, 0))",
        textAlign: "left",
        color: VIDEO_FRAME_TEXT,
    },
    title: {
        fontSize: 18,
        fontWeight: 700,
        lineHeight: 1.3,
    },
    description: {
        marginTop: 6,
        fontSize: 14,
        lineHeight: 1.45,
        color: "#c9b894",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        "& a": {
            color: VIDEO_FRAME_TEXT,
        },
    },
    clamped: {
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
    },
    bottom: {
        flexShrink: 0,
        padding: "10px 16px calc(14px + env(safe-area-inset-bottom))",
    },
    time: {
        fontSize: 12,
        color: "#c9b894",
        fontVariantNumeric: "tabular-nums",
    },
}))

/** Plain text of the description of the video: the full one from the video site, else the one from the feed. */
const useCaptionText = (entry: Entry) => {
    const { info } = useVideoInfo(entry.id)
    const feedText = useMemo(() => {
        const html = cleanVideoDescription(entry.content || entry.mediaDescription)
        return new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? ""
    }, [entry.content, entry.mediaDescription])
    return info?.description || feedText
}

const normalize = (text: string) =>
    text
        .replace(/\s+/g, " ")
        .replace(/(\.\.\.|\u2026)$/, "")
        .trim()
        .toLowerCase()

/**
 * What to show in the caption. Feeds often use the description of short videos as their title too (e.g. TikTok): the
 * text is then shown once, the longer version when one starts with the other.
 */
export const captionParts = (title: string, description: string): { title?: string; description?: string } => {
    const t = normalize(title)
    const d = normalize(description)
    if (!d || d === t || t.startsWith(d)) return { title }
    if (d.startsWith(t)) return { description }
    return { title, description }
}

const openLabel = (url: string) => {
    if (url.includes("tiktok.com")) return msg`Open on TikTok`
    if (url.includes("youtube.com") || url.includes("youtu.be")) return msg`Open on YouTube`
    return msg`Open original`
}

/**
 * TikTok-style viewer for short, vertical videos on phones: the video takes the whole screen, starts on its own and
 * loops. Swipe up for the next video, down for the previous one. Videos that are not downloaded yet are downloaded
 * as soon as they are opened.
 */
export function ShortVideoView(props: Readonly<{ entry: Entry; onBack: () => void }>) {
    const { classes, cx } = useStyles()
    const { _ } = useLingui()
    const dispatch = useAppDispatch()
    const { entry } = props
    const status = useAppSelector(state => state.videos.statuses[entry.id])
    const requestError = useAppSelector(state => state.videos.requestErrors[entry.id])
    const [video, setVideo] = useState<HTMLVideoElement | null>(null)
    const [mutedByBrowser, setMutedByBrowser] = useState(false)
    const [captionExpanded, setCaptionExpanded] = useState(false)
    const [noMoreVideos, setNoMoreVideos] = useState(false)
    const player = usePlayerState(video)
    const caption = captionParts(entry.title, useCaptionText(entry))
    const downloaded = status?.status === "DONE"
    const requested = useRef<string | undefined>(undefined)

    // a new video: collapse the caption and forget the previous messages
    // biome-ignore lint/correctness/useExhaustiveDependencies: only when switching videos
    useEffect(() => {
        setCaptionExpanded(false)
        setNoMoreVideos(false)
        setMutedByBrowser(false)
    }, [entry.id])

    // download the video as soon as it's opened. Failed downloads are only retried on demand, to avoid loops.
    useEffect(() => {
        if (!status) {
            dispatch(loadVideoStatus(entry.id))
        } else if (status.status === "NONE" && requested.current !== entry.id) {
            requested.current = entry.id
            dispatch(requestVideoDownload(entry.id))
        }
    }, [dispatch, entry.id, status])

    // start playing with sound if the browser allows it, else muted
    useEffect(() => {
        if (!video || !downloaded) return
        video.muted = false
        video.play().catch((err: unknown) => {
            if (err instanceof DOMException && err.name === "NotAllowedError") {
                video.muted = true
                setMutedByBrowser(true)
                video.play().catch(() => {
                    // the user starts the video with a tap
                })
            }
        })
    }, [video, downloaded])

    const togglePlay = () => {
        if (!video) return
        if (video.paused) {
            video.play().catch(() => {})
        } else {
            video.pause()
        }
    }
    const unmute = () => {
        if (!video) return
        video.muted = false
        setMutedByBrowser(false)
    }
    const seek = (time: number) => {
        if (video) video.currentTime = time
    }

    const goTo = useCallback(
        async (direction: "next" | "previous") => {
            const found = await dispatch(selectAdjacentVideo({ direction })).unwrap()
            setNoMoreVideos(!found && direction === "next")
        },
        [dispatch]
    )
    const swipeHandlers = useSwipeable({
        onSwipedUp: async () => await goTo("next"),
        onSwipedDown: async () => await goTo("previous"),
        delta: SWIPE_DELTA,
    })

    const error = status?.status === "FAILED" ? status.error : requestError

    return (
        <Box className={cx("cf-short-video", classes.root)}>
            <Group className={classes.bar} gap={6} wrap="nowrap">
                <ActionIcon
                    variant="transparent"
                    className={classes.iconButton}
                    aria-label={_(msg`Back to entries`)}
                    onClick={props.onBack}
                >
                    <TbChevronLeft size={22} />
                </ActionIcon>
                <FeedFavicon url={entry.iconUrl} size={22} />
                <span className={classes.feedName}>{entry.feedName}</span>
                {downloaded && (
                    <span className={classes.chip}>
                        <Trans>Downloaded</Trans>
                    </span>
                )}
                {isVideoDownloadInProgress(status) && status?.progress !== undefined && (
                    <span className={classes.chip}>{Math.floor(status.progress)}%</span>
                )}
            </Group>

            <Box {...swipeHandlers} className={classes.stage}>
                {downloaded && (
                    // biome-ignore lint/a11y/useMediaCaption: we don't have any captions for videos
                    <video
                        key={entry.id}
                        ref={setVideo}
                        className={classes.video}
                        src={`rest/entry/video/${entry.id}`}
                        playsInline
                        loop
                        onClick={togglePlay}
                    />
                )}

                {downloaded && !player.playing && (
                    <div className={classes.center} aria-hidden="true" style={{ pointerEvents: "none" }}>
                        <span className={classes.playIndicator}>
                            <TbPlayerPlayFilled size={26} />
                        </span>
                    </div>
                )}

                {!downloaded && (
                    <div className={classes.center}>
                        {error ? (
                            <Stack align="center" gap="sm">
                                <Text size="sm" ta="center" style={{ whiteSpace: "pre-wrap" }}>
                                    <Trans>Could not download video</Trans>: {error}
                                </Text>
                                <Button leftSection={<TbRefresh size={16} />} onClick={() => dispatch(requestVideoDownload(entry.id))}>
                                    <Trans>Retry</Trans>
                                </Button>
                            </Stack>
                        ) : (
                            <Box w="80%">{status && <DownloadProgress status={status} dimmedColor={VIDEO_FRAME_TEXT} />}</Box>
                        )}
                    </div>
                )}

                {mutedByBrowser && (
                    <UnstyledButton className={classes.unmute} onClick={unmute}>
                        <TbVolume3 size={16} />
                        <Trans>Tap to unmute</Trans>
                    </UnstyledButton>
                )}

                <UnstyledButton
                    className={cx("cf-short-video-caption", classes.caption)}
                    aria-expanded={captionExpanded}
                    onClick={() => setCaptionExpanded(!captionExpanded)}
                >
                    {caption.title && <div className={classes.title}>{caption.title}</div>}
                    {caption.description && (
                        <div className={cx(classes.description, !captionExpanded && classes.clamped)}>
                            <LinkifiedText text={caption.description} />
                        </div>
                    )}
                </UnstyledButton>

                <div className={classes.rail}>
                    <UnstyledButton
                        className={classes.railButton}
                        aria-label={entry.starred ? _(msg`Unstar`) : _(msg`Star`)}
                        aria-pressed={entry.starred}
                        onClick={() => dispatch(starEntry({ entry, starred: !entry.starred }))}
                    >
                        {entry.starred ? <TbStarFilled size={22} /> : <TbStar size={22} />}
                    </UnstyledButton>
                    <Popover position="left" withinPortal={false}>
                        <Popover.Target>
                            <UnstyledButton className={classes.railButton} aria-label={_(msg`Share`)}>
                                <TbShare size={22} />
                            </UnstyledButton>
                        </Popover.Target>
                        <Popover.Dropdown>
                            <ShareButtons url={entry.url} description={entry.title} />
                        </Popover.Dropdown>
                    </Popover>
                    <a
                        href={entry.url}
                        target="_blank"
                        rel="noreferrer"
                        className={classes.railButton}
                        aria-label={_(openLabel(entry.url))}
                    >
                        <TbExternalLink size={22} />
                    </a>
                </div>
            </Box>

            <div className={classes.bottom}>
                <SeekBar currentTime={player.currentTime} duration={player.duration} chapters={[]} onSeek={seek} />
                <Group justify="space-between" mt={8}>
                    <span className={classes.time}>
                        {formatDuration(player.currentTime)} / {formatDuration(Math.round(player.duration))}
                    </span>
                    {noMoreVideos ? (
                        <Text size="sm" className={classes.time}>
                            <Trans>No more videos</Trans>
                        </Text>
                    ) : (
                        <Button
                            size="xs"
                            variant="outline"
                            color="gray"
                            radius={cf("radius")}
                            rightSection={<TbPlayerTrackNextFilled size={14} />}
                            onClick={async () => await goTo("next")}
                            styles={{ root: { color: VIDEO_FRAME_TEXT, borderColor: "var(--cf-header-border)" } }}
                        >
                            <Trans>Next video</Trans>
                        </Button>
                    )}
                </Group>
            </div>
        </Box>
    )
}
