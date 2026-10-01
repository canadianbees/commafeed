import { Trans } from "@lingui/react/macro"
import { Box, Collapse, UnstyledButton } from "@mantine/core"
import { useEffect, useId, useState } from "react"
import { TbChevronDown } from "react-icons/tb"
import { useAppDispatch, useAppSelector } from "@/app/store"
import type { VideoChapter } from "@/app/types"
import { setChaptersCollapsed } from "@/app/user/slice"
import { formatDuration } from "@/app/utils"
import { cf } from "@/theme/tokens"
import { tss } from "@/tss"

const useStyles = tss.create(() => ({
    root: {
        border: `1px solid ${cf("border")}`,
        borderRadius: cf("radius"),
        background: cf("bg"),
        overflow: "hidden",
    },
    heading: {
        margin: 0,
    },
    toggle: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        minHeight: 44,
        padding: "10px 16px",
        color: cf("text"),
        "&[aria-expanded='true']": {
            borderBottom: `1px solid ${cf("border")}`,
        },
    },
    label: {
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
    },
    summary: {
        flexGrow: 1,
        minWidth: 0,
        fontSize: 13,
        color: cf("text-muted"),
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    chevron: {
        flexShrink: 0,
        transition: "transform 150ms",
        "[aria-expanded='false'] &": {
            transform: "rotate(-90deg)",
        },
    },
    row: {
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        width: "100%",
        padding: "11px 16px 11px 13px",
        borderBottom: `1px solid ${cf("border")}`,
        borderLeft: "3px solid transparent",
        color: cf("text"),
        "&:hover": {
            background: cf("surface-selected"),
        },
        "&[data-current]": {
            background: cf("surface-selected"),
            borderLeftColor: cf("accent"),
        },
    },
    time: {
        width: 58,
        flexShrink: 0,
        fontSize: 13,
        fontVariantNumeric: "tabular-nums",
        color: cf("text-muted"),
    },
    title: {
        fontSize: 14,
        fontWeight: 600,
    },
    track: {
        display: "block",
        height: 3,
        marginTop: 6,
        background: cf("surface-selected"),
    },
    played: {
        display: "block",
        height: 3,
        background: cf("video"),
    },
}))

/** Follows the playback position of the video. */
const useCurrentTime = (video: HTMLVideoElement | null) => {
    const [currentTime, setCurrentTime] = useState(0)
    useEffect(() => {
        if (!video) return
        const update = () => setCurrentTime(video.currentTime)
        update()
        video.addEventListener("timeupdate", update)
        video.addEventListener("seeked", update)
        return () => {
            video.removeEventListener("timeupdate", update)
            video.removeEventListener("seeked", update)
        }
    }, [video])
    return currentTime
}

/** Index of the chapter being played. */
export const currentChapterIndex = (chapters: VideoChapter[], time: number) => {
    let current = 0
    chapters.forEach((chapter, index) => {
        if (chapter.startTime <= time) current = index
    })
    return current
}

/** How much of each chapter has been played, from 0 to 100, based on the playback position. */
export const chapterProgress = (chapters: VideoChapter[], time: number, duration?: number) =>
    chapters.map((chapter, index) => {
        const end = chapters[index + 1]?.startTime ?? duration ?? chapter.startTime
        // unknown length (e.g. the video isn't loaded yet): nothing is played
        if (end <= chapter.startTime || time <= chapter.startTime) return 0
        if (time >= end) return 100
        return ((time - chapter.startTime) / (end - chapter.startTime)) * 100
    })

/**
 * Chapters of a video. The chapter being played is highlighted and clicking a chapter plays the video from there.
 * Seeking needs the downloaded video: without it the chapters are only listed.
 */
export function VideoChapters(
    props: Readonly<{
        chapters: VideoChapter[]
        duration?: number
        video: HTMLVideoElement | null
    }>
) {
    const { classes, cx } = useStyles()
    const currentTime = useCurrentTime(props.video)
    const collapsed = useAppSelector(state => state.user.localSettings.chaptersCollapsed)
    const dispatch = useAppDispatch()
    const listId = useId()

    if (props.chapters.length === 0) return null

    const current = currentChapterIndex(props.chapters, currentTime)
    const progress = chapterProgress(props.chapters, currentTime, props.duration)

    const play = (chapter: VideoChapter) => {
        if (!props.video) return
        props.video.currentTime = chapter.startTime
        props.video.play().catch(() => {
            // autoplay may be refused by the browser, the video stays at the chapter's start
        })
    }

    return (
        <Box component="aside" aria-label="Chapters" className={cx("cf-video-chapters", classes.root)}>
            <h2 className={classes.heading}>
                <UnstyledButton
                    className={classes.toggle}
                    aria-expanded={!collapsed}
                    aria-controls={listId}
                    onClick={() => dispatch(setChaptersCollapsed(!collapsed))}
                >
                    <span className={classes.label}>
                        <Trans>Chapters</Trans>
                    </span>
                    {/* folded: the chapter being played, else the number of chapters */}
                    <span className={classes.summary}>
                        {collapsed ? `${current + 1} · ${props.chapters[current].title}` : props.chapters.length}
                    </span>
                    <TbChevronDown size={16} className={classes.chevron} aria-hidden="true" />
                </UnstyledButton>
            </h2>
            <Collapse expanded={!collapsed} id={listId} transitionDuration={200}>
                {props.chapters.map((chapter, index) => (
                    <UnstyledButton
                        key={`${chapter.startTime}-${chapter.title}`}
                        className={classes.row}
                        data-current={index === current || undefined}
                        aria-current={index === current ? "true" : undefined}
                        disabled={!props.video}
                        onClick={() => play(chapter)}
                    >
                        <span className={classes.time}>{formatDuration(chapter.startTime)}</span>
                        <span style={{ flexGrow: 1 }}>
                            <span className={classes.title}>{chapter.title}</span>
                            <span className={classes.track}>
                                <span className={classes.played} style={{ width: `${progress[index]}%` }} />
                            </span>
                        </span>
                    </UnstyledButton>
                ))}
            </Collapse>
        </Box>
    )
}
