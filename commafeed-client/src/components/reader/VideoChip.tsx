import { Trans } from "@lingui/react/macro"
import { Box, Group } from "@mantine/core"
import { TbAlertTriangle, TbCheck, TbPlayerPlayFilled } from "react-icons/tb"
import type { VideoDownloadStatus } from "@/app/types"
import { isVideoDownloadInProgress } from "@/app/videos/slice"
import { cf } from "@/theme/tokens"
import { tss } from "@/tss"

const useStyles = tss.create(() => ({
    chip: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 22,
        padding: "0 8px",
        borderRadius: cf("radius"),
        background: cf("video"),
        color: cf("on-video"),
        fontSize: 12,
        fontWeight: 600,
        width: "fit-content",
    },
    failed: {
        color: cf("accent-text"),
        fontSize: 12,
        fontWeight: 600,
    },
    progressText: {
        fontSize: 12,
        fontWeight: 600,
        color: cf("video-text"),
    },
    track: {
        height: 5,
        background: cf("surface-selected"),
        overflow: "hidden",
    },
    fill: {
        height: 5,
        background: cf("video"),
        transition: "width 1s linear",
    },
}))

/**
 * Marks an entry as a video, with its download status: downloaded, downloading (with a progress bar) or failed.
 */
export function VideoChip(props: Readonly<{ status?: VideoDownloadStatus }>) {
    const { classes, cx } = useStyles()
    const status = props.status

    if (isVideoDownloadInProgress(status)) {
        const percent = status?.stage === "MERGING" ? 100 : Math.floor(status?.progress ?? 0)
        return (
            <Box className="cf-video-chip cf-video-chip-downloading">
                <Group justify="space-between" mb={4}>
                    <span className={classes.progressText}>
                        {status?.stage === "MERGING" ? (
                            <Trans>Merging video and audio…</Trans>
                        ) : (
                            <Trans>Downloading video… {percent}%</Trans>
                        )}
                    </span>
                </Group>
                <div
                    className={classes.track}
                    role="progressbar"
                    aria-label="Download progress"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                >
                    <div className={classes.fill} style={{ width: `${percent}%` }} />
                </div>
            </Box>
        )
    }

    if (status?.status === "FAILED") {
        return (
            <Group gap={6} className={cx("cf-video-chip", "cf-video-chip-failed", classes.failed)}>
                <TbAlertTriangle size={13} aria-hidden="true" />
                <Trans>Video · Download failed</Trans>
            </Group>
        )
    }

    const downloaded = status?.status === "DONE"
    return (
        <span className={cx("cf-video-chip", downloaded && "cf-video-chip-downloaded", classes.chip)}>
            {downloaded ? <TbCheck size={12} aria-hidden="true" /> : <TbPlayerPlayFilled size={11} aria-hidden="true" />}
            {downloaded ? <Trans>Video · Downloaded</Trans> : <Trans>Video</Trans>}
        </span>
    )
}
