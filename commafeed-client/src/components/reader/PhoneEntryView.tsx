import { msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import { ActionIcon, Box, Group, Text } from "@mantine/core"
import { useCallback, useEffect, useState } from "react"
import { TbChevronLeft } from "react-icons/tb"
import { useLocation, useNavigate } from "react-router-dom"
import { useSwipeable } from "react-swipeable"
import { registerScrollContainer } from "@/app/scrollContainers"
import { useAppSelector } from "@/app/store"
import { FeedFavicon } from "@/components/content/FeedFavicon"
import { useShortVideo } from "@/hooks/useShortVideo"
import { cf } from "@/theme/tokens"
import { tss } from "@/tss"
import { ReadingPane } from "./ReadingPane"
import { ShortVideoView } from "./ShortVideoView"

const useStyles = tss.create(() => ({
    view: {
        position: "fixed",
        inset: 0,
        // above the app shell header and footer
        zIndex: 150,
        display: "flex",
        flexDirection: "column",
        background: cf("surface"),
    },
    bar: {
        height: 56,
        flexShrink: 0,
        padding: "0 6px",
        background: cf("header-bg"),
        borderBottom: `2px solid ${cf("header-border")}`,
        color: cf("header-text"),
    },
    back: {
        width: 44,
        height: 44,
        color: cf("header-icon"),
    },
    feedName: {
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: "0.05em",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    body: {
        flexGrow: 1,
        overflowY: "auto",
        overscrollBehavior: "contain",
    },
}))

interface EntryViewState {
    entryOpen?: boolean
}

/**
 * Opens and closes the full-screen entry view on phones. Opening adds a step to the browser history, so that the back
 * button or gesture of the phone closes the view. The rest of the location state is kept (e.g. the timestamp that
 * would otherwise reload the entries).
 */
export const useEntryView = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const open = !!(location.state as EntryViewState | null)?.entryOpen

    const openView = useCallback(() => {
        if (open) return
        navigate(location.pathname, { state: { ...(location.state ?? {}), entryOpen: true } })
    }, [location.pathname, location.state, navigate, open])
    const closeView = useCallback(() => {
        if (open) navigate(-1)
    }, [navigate, open])

    return { open, openView, closeView }
}

/** The selected entry, full screen on phones, with a bar to go back to the list. */
export function PhoneEntryView() {
    const { classes, cx } = useStyles()
    const { _ } = useLingui()
    const { open, closeView } = useEntryView()
    const entry = useAppSelector(state => state.entries.entries.find(e => e.id === state.entries.selectedEntryId))
    const [view, setView] = useState<HTMLDivElement | null>(null)
    const visible = open && !!entry
    // short, vertical videos get the TikTok-style viewer
    const shortVideo = useShortVideo(entry)

    // the list underneath keeps its scroll position
    useEffect(() => {
        if (!visible) return
        const previous = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = previous
        }
    }, [visible])

    // swiping in the view must not open the menu, which listens to swipes on the whole page
    useEffect(() => {
        if (!view) return
        const stop = (e: Event) => e.stopPropagation()
        const events = ["touchstart", "touchmove", "touchend", "mousedown"]
        for (const event of events) view.addEventListener(event, stop)
        return () => {
            for (const event of events) view.removeEventListener(event, stop)
        }
    }, [view])

    const swipeHandlers = useSwipeable({ onSwipedRight: closeView, delta: 60 })
    const setViewRef = useCallback(
        (element: HTMLDivElement | null) => {
            setView(element)
            swipeHandlers.ref(element)
        },
        [swipeHandlers]
    )

    if (!visible) return null

    if (shortVideo) {
        return (
            <Box ref={setViewRef} className={cx("cf-phone-entry-view", classes.view)} role="dialog" aria-label={entry.title}>
                <ShortVideoView entry={entry} onBack={closeView} />
            </Box>
        )
    }

    return (
        <Box ref={setViewRef} className={cx("cf-phone-entry-view", classes.view)} role="dialog" aria-label={entry.title}>
            <Group className={classes.bar} gap={4} wrap="nowrap">
                <ActionIcon variant="transparent" className={classes.back} aria-label={_(msg`Back to entries`)} onClick={closeView}>
                    <TbChevronLeft size={22} />
                </ActionIcon>
                <FeedFavicon url={entry.iconUrl} size={18} />
                <Text component="span" className={classes.feedName}>
                    {entry.feedName}
                </Text>
            </Group>
            <Box
                className={classes.body}
                // lets entry selection (next/previous) show the new entry from its top
                ref={(element: HTMLDivElement | null) => registerScrollContainer("readingPane", element)}
            >
                <ReadingPane entry={entry} compact />
            </Box>
        </Box>
    )
}
