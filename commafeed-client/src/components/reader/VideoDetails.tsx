import { Trans } from "@lingui/react/macro"
import { Group } from "@mantine/core"
import { useAppSelector } from "@/app/store"
import { formatBytes, formatDuration } from "@/app/utils"
import { cf } from "@/theme/tokens"
import { tss } from "@/tss"

const useStyles = tss.create(() => ({
    chip: {
        display: "inline-flex",
        alignItems: "center",
        height: 24,
        padding: "0 8px",
        borderRadius: cf("radius"),
        fontSize: 12,
        whiteSpace: "nowrap",
    },
    downloaded: {
        background: cf("video"),
        color: cf("on-video"),
        fontWeight: 600,
    },
    outline: {
        border: `1px solid ${cf("border")}`,
        color: cf("text-muted"),
    },
}))

const DAY = 24 * 60 * 60 * 1000

/** Whole days left before the given date, at least one. */
export const daysUntil = (date: number) => Math.max(1, Math.ceil((date - Date.now()) / DAY))

/** Download size, removal date and length of a video. */
export function VideoDetails(
    props: Readonly<{
        entryId: string
        duration?: number
        /** where the user stopped watching, in seconds: shows the time left */
        position?: number
    }>
) {
    const { classes, cx } = useStyles()
    const status = useAppSelector(state => state.videos.statuses[props.entryId])
    const downloaded = status?.status === "DONE"
    const daysLeft = status?.expiresAt ? daysUntil(status.expiresAt) : 0

    if (!downloaded && !props.duration) return null
    const timeLeft = props.duration && props.position ? Math.max(0, props.duration - props.position) : 0

    return (
        <Group gap={8} className="cf-video-details">
            {downloaded && (
                <span className={cx(classes.chip, classes.downloaded)}>
                    {status.size ? <Trans>Downloaded · {formatBytes(status.size)}</Trans> : <Trans>Downloaded</Trans>}
                </span>
            )}
            {props.duration && <span className={cx(classes.chip, classes.outline)}>{formatDuration(props.duration)}</span>}
            {timeLeft > 0 && (
                <span className={cx(classes.chip, classes.outline)}>
                    <Trans>{formatDuration(timeLeft)} left</Trans>
                </span>
            )}
            {downloaded && status.expiresAt && (
                <span className={cx(classes.chip, classes.outline)}>
                    {daysLeft === 1 ? <Trans>Removed tomorrow</Trans> : <Trans>Removed in {daysLeft} days</Trans>}
                </span>
            )}
        </Group>
    )
}
