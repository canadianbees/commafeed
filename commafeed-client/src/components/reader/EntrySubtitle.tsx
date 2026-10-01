import { Group } from "@mantine/core"
import type { Entry } from "@/app/types"
import { FeedFavicon } from "@/components/content/FeedFavicon"
import { RelativeDate } from "@/components/RelativeDate"
import { cf } from "@/theme/tokens"
import { tss } from "@/tss"

const useStyles = tss.withParams<{ size: "sm" | "md" }>().create(({ size }) => ({
    root: {
        color: cf("subtitle"),
        fontSize: size === "sm" ? 12 : 14,
        letterSpacing: "0.05em",
        minWidth: 0,
    },
    feedName: {
        fontWeight: 600,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    // the date is kept whole, only the feed name is shortened when space is missing
    fixed: {
        flexShrink: 0,
        whiteSpace: "nowrap",
    },
}))

/** Feed icon, feed name and relative date of an entry. */
export function EntrySubtitle(
    props: Readonly<{
        entry: Entry
        size?: "sm" | "md"
    }>
) {
    const size = props.size ?? "sm"
    const { classes, cx } = useStyles({ size })
    return (
        <Group className={cx("cf-header-subtitle", classes.root)} gap={6} wrap="nowrap">
            <FeedFavicon url={props.entry.iconUrl} size={size === "sm" ? 14 : 18} />
            <span className={classes.feedName}>{props.entry.feedName}</span>
            <span aria-hidden="true" className={classes.fixed}>
                ·
            </span>
            <span className={classes.fixed}>
                <RelativeDate date={props.entry.date} />
            </span>
        </Group>
    )
}
