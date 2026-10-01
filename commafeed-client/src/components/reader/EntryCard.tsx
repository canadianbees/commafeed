import { Trans } from "@lingui/react/macro"
import { Box, Text } from "@mantine/core"
import { useMemo } from "react"
import { useSwipeable } from "react-swipeable"
import { Constants } from "@/app/constants"
import { useAppSelector } from "@/app/store"
import type { Entry } from "@/app/types"
import { formatDuration } from "@/app/utils"
import { FeedEntryContextMenu } from "@/components/content/FeedEntryContextMenu"
import { cf } from "@/theme/tokens"
import { tss } from "@/tss"
import { EntrySubtitle } from "./EntrySubtitle"
import { VideoChip } from "./VideoChip"

const SNIPPET_LENGTH = 160

const useStyles = tss.withParams<{ read: boolean; selected: boolean; accentEdge: boolean }>().create(({ read, selected, accentEdge }) => ({
    card: {
        background: selected ? cf("surface-selected") : cf("surface"),
        borderBottom: `1px solid ${cf("border")}`,
        borderLeft: `3px solid ${accentEdge ? cf("accent") : "transparent"}`,
        // only on devices that can hover: on touch screens the hover state would stay after a tap
        "@media (hover: hover)": {
            "&:hover": {
                background: cf("surface-selected"),
            },
        },
    },
    link: {
        display: "flex",
        flexDirection: "column",
        gap: 5,
        padding: "14px 20px 14px 17px",
        color: cf("text"),
        textDecoration: "none",
    },
    title: {
        fontSize: 16,
        lineHeight: 1.35,
        fontWeight: read ? 500 : 700,
        color: read ? cf("text-muted") : cf("text"),
    },
    position: {
        fontSize: 12,
        color: cf("text-muted"),
    },
    snippet: {
        fontSize: 14,
        lineHeight: 1.5,
        color: cf("text-muted"),
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
    },
}))

/** Plain text beginning of the entry content, used as a preview in the list. */
export const entrySnippet = (entry: Entry) => {
    const html = entry.content || entry.mediaDescription || ""
    const text = new DOMParser().parseFromString(html, "text/html").body.textContent ?? ""
    const collapsed = text.replace(/\s+/g, " ").trim()
    return collapsed.length > SNIPPET_LENGTH ? `${collapsed.slice(0, SNIPPET_LENGTH - 1)}…` : collapsed
}

/** An entry in the list of the reading pane layout. Selecting it shows the entry in the reading pane. */
export function EntryCard(
    props: Readonly<{
        entry: Entry
        selected: boolean
        onClick: (e: React.MouseEvent) => void
        onRightClick: (e: React.MouseEvent) => void
        /** swiping the card to the left, e.g. to toggle its read status on phones */
        onSwipedLeft?: () => void
        /** marks unread entries with the accent edge (phones), instead of the selected one only */
        unreadEdge?: boolean
    }>
) {
    // the selected entry, and on phones the unread ones, are marked with the accent edge
    const accentEdge = props.selected || (!!props.unreadEdge && !props.entry.read)
    const { classes, cx } = useStyles({ read: props.entry.read, selected: props.selected, accentEdge })
    const snippet = useMemo(() => entrySnippet(props.entry), [props.entry])
    const videoStatus = useAppSelector(state => state.videos.statuses[props.entry.id])
    const swipeHandlers = useSwipeable({ onSwipedLeft: props.onSwipedLeft })

    return (
        <Box
            component="article"
            {...(props.onSwipedLeft ? swipeHandlers : {})}
            id={Constants.dom.entryId(props.entry)}
            data-accent-edge={accentEdge || undefined}
            data-id={props.entry.id}
            data-feed-id={props.entry.feedId}
            className={cx("cf-entry-card", props.entry.read ? "read" : "unread", props.selected && "selected", classes.card)}
        >
            <a
                className={cx("cf-header", classes.link)}
                href={props.entry.url}
                target="_blank"
                rel="noreferrer"
                aria-current={props.selected ? "true" : undefined}
                onClick={props.onClick}
                onAuxClick={props.onClick}
                onContextMenu={props.onRightClick}
            >
                <EntrySubtitle entry={props.entry} />
                <Text component="span" className={cx("cf-header-title", classes.title)}>
                    {props.entry.title}
                </Text>
                {props.entry.downloadableVideo && <VideoChip status={videoStatus} />}
                {props.entry.downloadableVideo && props.entry.videoPosition !== undefined && props.entry.videoPosition !== null && (
                    <span className={cx("cf-video-position", classes.position)}>
                        <Trans>Stopped at {formatDuration(props.entry.videoPosition)}</Trans>
                    </span>
                )}
                {!props.entry.downloadableVideo && snippet && <span className={classes.snippet}>{snippet}</span>}
            </a>
            <FeedEntryContextMenu entry={props.entry} />
        </Box>
    )
}
