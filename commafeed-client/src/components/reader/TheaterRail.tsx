import { msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import { ActionIcon, Divider, Stack, Tooltip } from "@mantine/core"
import type { ReactNode } from "react"
import { TbInbox, TbStar } from "react-icons/tb"
import { Constants } from "@/app/constants"
import { redirectToCategory, redirectToFeed, redirectToRootCategory } from "@/app/redirect/thunks"
import { useAppDispatch, useAppSelector } from "@/app/store"
import { flattenCategoryTree } from "@/app/utils"
import { setTheater } from "@/app/videos/slice"
import { FeedFavicon } from "@/components/content/FeedFavicon"
import { cf } from "@/theme/tokens"
import { tss } from "@/tss"

export const THEATER_RAIL_WIDTH = 64
const MAX_FEEDS = 12

const useStyles = tss.create(() => ({
    button: {
        width: 44,
        height: 44,
        color: cf("sidebar-text"),
        "&:hover": {
            background: cf("sidebar-active-bg"),
        },
    },
}))

function RailButton(props: Readonly<{ label: string; onClick: () => void; children: ReactNode }>) {
    const { classes } = useStyles()
    return (
        <Tooltip label={props.label} position="right" openDelay={Constants.tooltip.delay}>
            <ActionIcon
                variant="transparent"
                radius={cf("radius")}
                className={classes.button}
                aria-label={props.label}
                onClick={props.onClick}
            >
                {props.children}
            </ActionIcon>
        </Tooltip>
    )
}

/**
 * The sidebar in theater mode: shortcuts to all entries, starred entries and the feeds with unread entries.
 * Going somewhere else leaves theater mode.
 */
export function TheaterRail() {
    const root = useAppSelector(state => state.tree.rootCategory)
    const dispatch = useAppDispatch()
    const { _ } = useLingui()

    const feeds = root
        ? flattenCategoryTree(root)
              .flatMap(c => c.feeds)
              .filter(f => f.unread > 0)
              .slice(0, MAX_FEEDS)
        : []

    const leaveTheater = (redirect: () => void) => () => {
        dispatch(setTheater(false))
        redirect()
    }

    return (
        <Stack className="cf-theater-rail" align="center" gap={6} py="xs">
            <RailButton label={_(msg`All`)} onClick={leaveTheater(() => dispatch(redirectToRootCategory()))}>
                <TbInbox size={20} />
            </RailButton>
            <RailButton label={_(msg`Starred`)} onClick={leaveTheater(() => dispatch(redirectToCategory(Constants.categories.starred.id)))}>
                <TbStar size={20} />
            </RailButton>
            {feeds.length > 0 && <Divider w={32} color={cf("sidebar-border")} />}
            {feeds.map(feed => (
                <RailButton key={feed.id} label={feed.name} onClick={leaveTheater(() => dispatch(redirectToFeed(feed.id)))}>
                    <FeedFavicon url={feed.iconUrl} size={22} />
                </RailButton>
            ))}
        </Stack>
    )
}
