import { msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import { Trans } from "@lingui/react/macro"
import { ActionIcon, Box, Group, Menu, Tooltip, UnstyledButton } from "@mantine/core"
import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import {
    TbArrowsMaximize,
    TbArrowsMinimize,
    TbMaximize,
    TbMinimize,
    TbPictureInPicture,
    TbPlayerPauseFilled,
    TbPlayerPlayFilled,
    TbVolume,
    TbVolume3,
} from "react-icons/tb"
import { Constants } from "@/app/constants"
import { useAppDispatch, useAppSelector } from "@/app/store"
import type { VideoChapter } from "@/app/types"
import { formatDuration } from "@/app/utils"
import { setTheater } from "@/app/videos/slice"
import { cf } from "@/theme/tokens"
import { tss } from "@/tss"
import { chapterProgress, currentChapterIndex } from "./VideoChapters"
import { VIDEO_FRAME_TEXT } from "./VideoFrame"

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const SEEK_STEP = 5
const HIDE_CONTROLS_DELAY = 2500
/** the video is considered finished when stopped this close to the end, in seconds */
const RESUME_END_MARGIN = 15

const useStyles = tss.create(() => ({
    root: {
        position: "absolute",
        inset: 0,
        outline: "none",
        // lets the controls adapt to the width of the player (see "@container" below)
        containerType: "inline-size",
        "&:focus-visible": {
            boxShadow: `inset 0 0 0 2px ${cf("accent")}`,
        },
    },
    video: {
        width: "100%",
        height: "100%",
        objectFit: "contain",
        display: "block",
        background: "#000",
    },
    prompt: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        padding: "20px 24px",
        maxWidth: "90%",
        borderRadius: cf("radius"),
        border: `1px solid ${cf("header-border")}`,
        background: "rgba(10, 10, 10, 0.85)",
        color: VIDEO_FRAME_TEXT,
        fontSize: 14,
        textAlign: "center",
    },
    promptButton: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 40,
        padding: "0 16px",
        borderRadius: cf("radius"),
        fontSize: 14,
        fontWeight: 600,
    },
    resume: {
        background: cf("accent"),
        color: cf("on-accent"),
    },
    startOver: {
        border: `1px solid ${cf("header-border")}`,
        color: VIDEO_FRAME_TEXT,
    },
    bigPlay: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 68,
        height: 68,
        borderRadius: 34,
        border: `2px solid ${cf("header-border")}`,
        background: "rgba(10, 10, 10, 0.7)",
        color: VIDEO_FRAME_TEXT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    badge: {
        position: "absolute",
        top: 14,
        left: 14,
        height: 26,
        padding: "0 10px",
        display: "inline-flex",
        alignItems: "center",
        borderRadius: cf("radius"),
        border: `1px solid ${cf("header-border")}`,
        background: "rgba(10, 10, 10, 0.75)",
        color: VIDEO_FRAME_TEXT,
        fontSize: 12,
        fontWeight: 600,
        transition: "opacity 200ms",
    },
    controls: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        padding: "10px 14px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        background: "linear-gradient(to top, rgba(10, 10, 10, 0.9), rgba(10, 10, 10, 0.55))",
        color: VIDEO_FRAME_TEXT,
        transition: "opacity 200ms",
    },
    hidden: {
        opacity: 0,
        pointerEvents: "none",
    },
    seek: {
        position: "relative",
        height: 14,
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
    },
    segments: {
        display: "flex",
        gap: 3,
        width: "100%",
        height: 5,
    },
    segment: {
        position: "relative",
        height: 5,
        background: "rgba(255, 255, 255, 0.25)",
        overflow: "hidden",
    },
    played: {
        position: "absolute",
        inset: 0,
        width: 0,
        background: cf("accent"),
    },
    range: {
        // the native slider handles dragging, keyboard and accessibility, the segments above are what is visible
        position: "absolute",
        inset: 0,
        width: "100%",
        margin: 0,
        opacity: 0,
        cursor: "pointer",
    },
    hover: {
        position: "absolute",
        bottom: 18,
        transform: "translateX(-50%)",
        padding: "2px 8px",
        borderRadius: cf("radius"),
        background: "rgba(10, 10, 10, 0.9)",
        border: `1px solid ${cf("header-border")}`,
        fontSize: 12,
        whiteSpace: "nowrap",
        pointerEvents: "none",
    },
    bar: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        minWidth: 0,
        "& > *": {
            flexShrink: 0,
        },
    },
    button: {
        color: VIDEO_FRAME_TEXT,
        "&:hover": {
            background: "rgba(255, 255, 255, 0.1)",
        },
    },
    time: {
        fontVariantNumeric: "tabular-nums",
        marginLeft: 4,
        whiteSpace: "nowrap",
    },
    volume: {
        width: 70,
        accentColor: cf("accent"),
        // narrow players keep the mute button only
        "@container (max-width: 560px)": {
            display: "none",
        },
    },
    optional: {
        "@container (max-width: 420px)": {
            display: "none",
        },
    },
    rate: {
        height: 28,
        padding: "0 8px",
        borderRadius: cf("radius"),
        border: "1px solid rgba(255, 255, 255, 0.3)",
        color: VIDEO_FRAME_TEXT,
        fontSize: 12,
        fontVariantNumeric: "tabular-nums",
    },
}))

export interface PlayerState {
    playing: boolean
    currentTime: number
    duration: number
    volume: number
    muted: boolean
    rate: number
}

/** Follows the state of the video element. */
export const usePlayerState = (video: HTMLVideoElement | null): PlayerState => {
    const [state, setState] = useState<PlayerState>({
        playing: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        muted: false,
        rate: 1,
    })
    useEffect(() => {
        if (!video) return
        const update = () =>
            setState({
                playing: !video.paused && !video.ended,
                currentTime: video.currentTime,
                duration: Number.isFinite(video.duration) ? video.duration : 0,
                volume: video.volume,
                muted: video.muted,
                rate: video.playbackRate,
            })
        update()
        const events = ["play", "pause", "ended", "timeupdate", "seeked", "durationchange", "loadedmetadata", "volumechange", "ratechange"]
        for (const event of events) video.addEventListener(event, update)
        return () => {
            for (const event of events) video.removeEventListener(event, update)
        }
    }, [video])
    return state
}

/** Whether the element is displayed in fullscreen. */
const useFullscreen = (element: HTMLElement | null) => {
    const [fullscreen, setFullscreen] = useState(false)
    useEffect(() => {
        const update = () => setFullscreen(!!element && document.fullscreenElement === element)
        document.addEventListener("fullscreenchange", update)
        return () => document.removeEventListener("fullscreenchange", update)
    }, [element])
    return fullscreen
}

function ControlButton(props: Readonly<{ label: string; onClick: () => void; pressed?: boolean; children: ReactNode }>) {
    const { classes } = useStyles()
    return (
        <Tooltip label={props.label} openDelay={Constants.tooltip.delay} withinPortal={false}>
            <ActionIcon
                variant="transparent"
                size={32}
                className={classes.button}
                aria-label={props.label}
                aria-pressed={props.pressed}
                onClick={props.onClick}
            >
                {props.children}
            </ActionIcon>
        </Tooltip>
    )
}

/** Seek bar split into one segment per chapter, with a time and chapter preview on hover. */
export function SeekBar(
    props: Readonly<{
        currentTime: number
        duration: number
        chapters: VideoChapter[]
        onSeek: (time: number) => void
    }>
) {
    const { classes } = useStyles()
    const { _ } = useLingui()
    const [hover, setHover] = useState<{ x: number; time: number }>()

    const duration = props.duration
    // without chapters, the bar is a single segment
    const chapters = props.chapters.length > 0 ? props.chapters : [{ startTime: 0, title: "" }]
    const progress = chapterProgress(chapters, props.currentTime, duration)
    const widths = chapters.map((chapter, index) => {
        const end = chapters[index + 1]?.startTime ?? duration
        return duration > 0 ? Math.max(0, end - chapter.startTime) / duration : 1 / chapters.length
    })
    const hoveredChapter = hover && props.chapters.length > 0 ? props.chapters[currentChapterIndex(props.chapters, hover.time)] : undefined

    return (
        <Box
            className={classes.seek}
            onMouseMove={e => {
                const rect = e.currentTarget.getBoundingClientRect()
                const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
                setHover({ x: ratio * rect.width, time: ratio * duration })
            }}
            onMouseLeave={() => setHover(undefined)}
        >
            <div className={classes.segments} aria-hidden="true">
                {chapters.map((chapter, index) => (
                    <div
                        key={`${chapter.startTime}-${chapter.title}`}
                        className={classes.segment}
                        style={{ flexGrow: widths[index], flexBasis: 0 }}
                    >
                        <div className={classes.played} style={{ width: `${progress[index]}%` }} />
                    </div>
                ))}
            </div>
            <input
                type="range"
                className={classes.range}
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(props.currentTime, duration || 0)}
                aria-label={_(msg`Seek`)}
                aria-valuetext={`${formatDuration(props.currentTime)} / ${formatDuration(duration)}`}
                onChange={e => props.onSeek(Number(e.currentTarget.value))}
            />
            {hover && duration > 0 && (
                <span className={classes.hover} style={{ left: hover.x }}>
                    {formatDuration(hover.time)}
                    {hoveredChapter ? ` · ${hoveredChapter.title}` : ""}
                </span>
            )}
        </Box>
    )
}

/**
 * Player for downloaded videos: chapters in the seek bar and a badge for the current chapter, playback speed,
 * picture in picture, theater mode and fullscreen. Controls hide while playing and come back when the mouse moves.
 *
 * Keyboard, while the player has the focus: space or k to play and pause, left and right arrows to go back and forward
 * 5 seconds, m to mute and f for fullscreen. These keys don't trigger the shortcuts of the page.
 */
export function VideoPlayer(
    props: Readonly<{
        src: string
        chapters?: VideoChapter[]
        /** show the theater mode button (reading pane layout) */
        theaterToggle?: boolean
        /** where the user stopped watching the video last time, in seconds: offers to resume from there */
        resumeAt?: number
        /** receives the size of the video once known, e.g. to spot vertical videos */
        onVideoSize?: (width: number, height: number) => void
        /** receives the video element */
        videoRef?: (video: HTMLVideoElement | null) => void
    }>
) {
    const { classes, cx } = useStyles()
    const { _ } = useLingui()
    const dispatch = useAppDispatch()
    const theater = useAppSelector(state => state.videos.theater)
    const [video, setVideo] = useState<HTMLVideoElement | null>(null)
    const [root, setRoot] = useState<HTMLDivElement | null>(null)
    const [controlsVisible, setControlsVisible] = useState(true)
    const [resumeDismissed, setResumeDismissed] = useState(false)
    const hideTimer = useRef<number | undefined>(undefined)

    const state = usePlayerState(video)
    const fullscreen = useFullscreen(root)
    const chapters = props.chapters ?? []

    // offer to resume, unless the video was almost finished. The prompt goes away once the video plays.
    const { resumeAt, src } = props
    const showResume =
        !resumeDismissed &&
        !state.playing &&
        resumeAt !== undefined &&
        resumeAt > 0 &&
        (state.duration === 0 || resumeAt < state.duration - RESUME_END_MARGIN)
    // biome-ignore lint/correctness/useExhaustiveDependencies: a new video offers to resume again
    useEffect(() => setResumeDismissed(false), [src])
    useEffect(() => {
        if (state.playing) setResumeDismissed(true)
    }, [state.playing])
    const currentChapter = chapters.length > 0 ? chapters[currentChapterIndex(chapters, state.currentTime)] : undefined
    const pictureInPictureAvailable = typeof document !== "undefined" && document.pictureInPictureEnabled

    const { videoRef } = props
    const videoElementRef = useCallback(
        (element: HTMLVideoElement | null) => {
            setVideo(element)
            videoRef?.(element)
        },
        [videoRef]
    )

    // controls hide after a while when playing, and are always visible when paused
    const showControls = useCallback(() => {
        setControlsVisible(true)
        window.clearTimeout(hideTimer.current)
        hideTimer.current = window.setTimeout(() => setControlsVisible(false), HIDE_CONTROLS_DELAY)
    }, [])
    useEffect(() => () => window.clearTimeout(hideTimer.current), [])
    const controlsShown = controlsVisible || !state.playing

    const togglePlay = () => {
        if (!video) return
        if (video.paused || video.ended) {
            video.play().catch(() => {
                // the browser may refuse to play, e.g. autoplay restrictions
            })
        } else {
            video.pause()
        }
    }
    const seek = (time: number) => {
        if (!video) return
        video.currentTime = Math.min(Math.max(0, time), state.duration || time)
    }
    const toggleMute = () => {
        if (video) video.muted = !video.muted
    }
    const setVolume = (volume: number) => {
        if (!video) return
        video.volume = volume
        video.muted = volume === 0
    }
    const setRate = (rate: number) => {
        if (video) video.playbackRate = rate
    }
    const toggleFullscreen = () => {
        if (!root) return
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {})
        } else {
            root.requestFullscreen().catch(() => {})
        }
    }
    const togglePictureInPicture = () => {
        if (!video) return
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(() => {})
        } else {
            video.requestPictureInPicture().catch(() => {})
        }
    }

    const onKeyDown = (e: KeyboardEvent) => {
        const actions: Record<string, () => void> = {
            " ": togglePlay,
            k: togglePlay,
            ArrowLeft: () => seek(state.currentTime - SEEK_STEP),
            ArrowRight: () => seek(state.currentTime + SEEK_STEP),
            m: toggleMute,
            f: toggleFullscreen,
        }
        const action = actions[e.key]
        // keys typed in the controls' own inputs (seek bar, volume) keep their native behavior
        if (!action || e.target instanceof HTMLInputElement) return
        e.preventDefault()
        // don't trigger the page's keyboard shortcuts (space, k, m, f...)
        e.stopPropagation()
        action()
        showControls()
    }

    return (
        // biome-ignore lint/a11y/noStaticElementInteractions: keyboard shortcuts of the player, every action also has a button
        <div
            ref={setRoot}
            className={cx("cf-video-player", classes.root)}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: the player takes the focus for its keyboard shortcuts
            tabIndex={0}
            onKeyDown={onKeyDown}
            onMouseMove={showControls}
            onMouseLeave={() => state.playing && setControlsVisible(false)}
        >
            {/* biome-ignore lint/a11y/useMediaCaption: we don't have any captions for videos */}
            <video
                ref={videoElementRef}
                className={classes.video}
                src={props.src}
                onClick={togglePlay}
                onDoubleClick={toggleFullscreen}
                onLoadedMetadata={e => props.onVideoSize?.(e.currentTarget.videoWidth, e.currentTarget.videoHeight)}
            />

            {showResume && (
                <div className={cx("cf-video-player-resume", classes.prompt)}>
                    <span>
                        <Trans>You stopped at {formatDuration(resumeAt ?? 0)}</Trans>
                    </span>
                    <Group gap="sm" justify="center">
                        <UnstyledButton
                            className={cx(classes.promptButton, classes.resume)}
                            onClick={() => {
                                setResumeDismissed(true)
                                seek(resumeAt ?? 0)
                                togglePlay()
                            }}
                        >
                            <TbPlayerPlayFilled size={14} />
                            <Trans>Resume</Trans>
                        </UnstyledButton>
                        <UnstyledButton
                            className={cx(classes.promptButton, classes.startOver)}
                            onClick={() => {
                                setResumeDismissed(true)
                                seek(0)
                                togglePlay()
                            }}
                        >
                            <Trans>Start over</Trans>
                        </UnstyledButton>
                    </Group>
                </div>
            )}

            {!state.playing && !showResume && (
                <UnstyledButton className={classes.bigPlay} aria-label={_(msg`Play`)} onClick={togglePlay}>
                    <TbPlayerPlayFilled size={26} />
                </UnstyledButton>
            )}

            {currentChapter && (
                <span className={cx("cf-video-player-chapter", classes.badge, !controlsShown && classes.hidden)}>
                    <Trans>
                        Chapter {chapters.indexOf(currentChapter) + 1} · {currentChapter.title}
                    </Trans>
                </span>
            )}

            <div className={cx("cf-video-player-controls", classes.controls, !controlsShown && classes.hidden)}>
                <SeekBar currentTime={state.currentTime} duration={state.duration} chapters={chapters} onSeek={seek} />
                <div className={classes.bar}>
                    <ControlButton label={state.playing ? _(msg`Pause`) : _(msg`Play`)} onClick={togglePlay}>
                        {state.playing ? <TbPlayerPauseFilled size={18} /> : <TbPlayerPlayFilled size={18} />}
                    </ControlButton>
                    <ControlButton label={state.muted ? _(msg`Unmute`) : _(msg`Mute`)} onClick={toggleMute} pressed={state.muted}>
                        {state.muted || state.volume === 0 ? <TbVolume3 size={18} /> : <TbVolume size={18} />}
                    </ControlButton>
                    <input
                        type="range"
                        className={classes.volume}
                        min={0}
                        max={1}
                        step={0.05}
                        value={state.muted ? 0 : state.volume}
                        aria-label={_(msg`Volume`)}
                        onChange={e => setVolume(Number(e.currentTarget.value))}
                    />
                    <span className={classes.time}>
                        {formatDuration(state.currentTime)} / {formatDuration(Math.round(state.duration))}
                    </span>
                    <div style={{ flexGrow: 1 }} />
                    <Menu position="top" withinPortal={false}>
                        <Menu.Target>
                            <UnstyledButton className={classes.rate} aria-label={_(msg`Playback speed`)}>
                                {state.rate}×
                            </UnstyledButton>
                        </Menu.Target>
                        <Menu.Dropdown>
                            {PLAYBACK_RATES.map(rate => (
                                <Menu.Item key={rate} onClick={() => setRate(rate)} fw={rate === state.rate ? 700 : undefined}>
                                    {rate}×
                                </Menu.Item>
                            ))}
                        </Menu.Dropdown>
                    </Menu>
                    {pictureInPictureAvailable && (
                        <span className={classes.optional}>
                            <ControlButton label={_(msg`Picture in picture`)} onClick={togglePictureInPicture}>
                                <TbPictureInPicture size={18} />
                            </ControlButton>
                        </span>
                    )}
                    {props.theaterToggle && (
                        <ControlButton
                            label={theater ? _(msg`Exit theater`) : _(msg`Theater`)}
                            onClick={() => dispatch(setTheater(!theater))}
                            pressed={theater}
                        >
                            {theater ? <TbArrowsMinimize size={18} /> : <TbArrowsMaximize size={18} />}
                        </ControlButton>
                    )}
                    <ControlButton
                        label={fullscreen ? _(msg`Exit fullscreen`) : _(msg`Fullscreen`)}
                        onClick={toggleFullscreen}
                        pressed={fullscreen}
                    >
                        {fullscreen ? <TbMinimize size={18} /> : <TbMaximize size={18} />}
                    </ControlButton>
                </div>
            </div>
        </div>
    )
}
