import { Trans } from "@lingui/react/macro"
import { Alert, Box, Button, Group, Progress, Stack, Text } from "@mantine/core"
import { useEffect } from "react"
import { TbDownload, TbRefresh } from "react-icons/tb"
import { useAppDispatch, useAppSelector } from "@/app/store"
import type { VideoChapter, VideoDownloadStatus } from "@/app/types"
import { isVideoDownloadInProgress } from "@/app/videos/slice"
import { loadVideoStatus, requestVideoDownload } from "@/app/videos/thunks"
import { VIDEO_FRAME_TEXT, VideoFrame } from "@/components/reader/VideoFrame"
import { VideoPlayer } from "@/components/reader/VideoPlayer"
import { Enclosure } from "./Enclosure"

const POLL_INTERVAL = 1000

const formatSpeed = (bytesPerSecond: number) => {
    const units = ["B/s", "KB/s", "MB/s", "GB/s"]
    let value = bytesPerSecond
    let unit = 0
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024
        unit++
    }
    return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

const formatEta = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const rest = String(seconds % 60).padStart(2, "0")
    return `${minutes}:${rest}`
}

export function DownloadProgress(props: Readonly<{ status: VideoDownloadStatus; dimmedColor?: string }>) {
    const { stage, progress, speed, eta } = props.status
    // no percentage while queued, merging or when the size is unknown: show an animated full bar instead
    const indeterminate = stage === "MERGING" || progress === undefined || progress === null

    let label = <Trans>Waiting to download…</Trans>
    if (stage === "VIDEO") label = <Trans>Downloading video…</Trans>
    else if (stage === "AUDIO") label = <Trans>Downloading audio…</Trans>
    else if (stage === "MERGING") label = <Trans>Merging video and audio…</Trans>
    else if (props.status.status === "DOWNLOADING") label = <Trans>Starting download…</Trans>

    const details = [
        !indeterminate && `${Math.floor(progress)}%`,
        stage !== "MERGING" && speed && formatSpeed(speed),
        stage !== "MERGING" && eta !== undefined && eta !== null && formatEta(eta),
    ].filter(Boolean)

    return (
        <Box>
            <Group justify="space-between" mb={4}>
                <Text size="sm">{label}</Text>
                <Text size="sm" c={props.dimmedColor ?? "dimmed"}>
                    {details.join(" · ")}
                </Text>
            </Group>
            <Progress
                value={indeterminate ? 100 : progress}
                striped={indeterminate}
                animated={indeterminate}
                aria-label="download progress"
                transitionDuration={POLL_INTERVAL}
            />
        </Box>
    )
}

export function DownloadableVideo(
    props: Readonly<{
        entryId: string
        /** inline: below the entry content, frame: in a 16:9 player frame (reading pane) */
        variant?: "inline" | "frame"
        /** receives the video element of the player, in the frame variant */
        videoRef?: (video: HTMLVideoElement | null) => void
        /** chapters shown in the player, in the frame variant */
        chapters?: VideoChapter[]
        /** show the theater mode button in the player, in the frame variant */
        theaterToggle?: boolean
        /** where the user stopped watching last time, in seconds, in the frame variant */
        resumeAt?: number
        /** receives the size of the video once known, in the frame variant */
        onVideoSize?: (width: number, height: number) => void
    }>
) {
    const frame = props.variant === "frame"
    const status = useAppSelector(state => state.videos.statuses[props.entryId])
    const requestError = useAppSelector(state => state.videos.requestErrors[props.entryId])
    const dispatch = useAppDispatch()

    const inProgress = isVideoDownloadInProgress(status)

    // fetch the status if not known yet, the video may already have been downloaded
    useEffect(() => {
        if (!status) dispatch(loadVideoStatus(props.entryId))
    }, [dispatch, status, props.entryId])

    const download = () => dispatch(requestVideoDownload(props.entryId))

    if (!status) return frame ? <VideoFrame>{null}</VideoFrame> : null

    const error = status.status === "FAILED" ? status.error : requestError
    const downloadButton = (
        <Button
            variant={frame ? "filled" : "default"}
            size={frame ? "sm" : "xs"}
            leftSection={error ? <TbRefresh size={16} /> : <TbDownload size={16} />}
            onClick={download}
        >
            {error ? <Trans>Retry</Trans> : <Trans>Download video</Trans>}
        </Button>
    )

    if (frame) {
        return (
            <VideoFrame>
                {status.status === "DONE" && (
                    <VideoPlayer
                        src={`rest/entry/video/${props.entryId}`}
                        chapters={props.chapters}
                        theaterToggle={props.theaterToggle}
                        resumeAt={props.resumeAt}
                        onVideoSize={props.onVideoSize}
                        videoRef={props.videoRef}
                    />
                )}
                {inProgress && (
                    <Box w="70%">
                        <DownloadProgress status={status} dimmedColor={VIDEO_FRAME_TEXT} />
                    </Box>
                )}
                {!inProgress && status.status !== "DONE" && (
                    <Stack align="center" gap="sm" maw="80%">
                        {error && (
                            <Text size="sm" ta="center" style={{ whiteSpace: "pre-wrap" }}>
                                <Trans>Could not download video</Trans>: {error}
                            </Text>
                        )}
                        {downloadButton}
                    </Stack>
                )}
            </VideoFrame>
        )
    }

    if (status.status === "DONE") {
        return <Enclosure enclosureType="video/mp4" enclosureUrl={`rest/entry/video/${props.entryId}`} />
    }

    if (inProgress) {
        return <DownloadProgress status={status} />
    }

    return (
        <>
            {error && (
                <Alert color="red" mb="xs" title={<Trans>Could not download video</Trans>}>
                    <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                        {error}
                    </Text>
                </Alert>
            )}
            {downloadButton}
        </>
    )
}
