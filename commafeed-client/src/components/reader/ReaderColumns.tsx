import { Box } from "@mantine/core"
import type { ReactNode } from "react"
import { registerScrollContainer } from "@/app/scrollContainers"
import { cf } from "@/theme/tokens"
import { tss } from "@/tss"

export const LIST_COLUMN_WIDTH = 440

const useStyles = tss.create(() => ({
    root: {
        display: "flex",
        // fill the space below the header, cancelling the padding of the app shell
        height: "calc(100dvh - var(--app-shell-header-offset, 0px))",
        margin: "calc(-1 * var(--mantine-spacing-md))",
        background: cf("bg"),
    },
    list: {
        // narrower on small desktop screens so that the reading pane keeps most of the space
        width: `clamp(280px, 40%, ${LIST_COLUMN_WIDTH}px)`,
        flexShrink: 0,
        overflowY: "auto",
        background: cf("bg"),
        borderRight: `1px solid ${cf("border")}`,
    },
    pane: {
        flexGrow: 1,
        minWidth: 0,
        overflowY: "auto",
        background: cf("surface"),
    },
}))

/** The entry list and the reading pane side by side, each scrolling on its own. */
export function ReaderColumns(
    props: Readonly<{
        list: ReactNode
        pane: ReactNode
        /** hides the entry list (theater mode). It stays mounted to keep its scroll position. */
        listHidden?: boolean
    }>
) {
    const { classes, cx } = useStyles()
    return (
        <Box className={cx("cf-reader-columns", classes.root)}>
            <Box
                component="section"
                className={cx("cf-reader-list", classes.list)}
                hidden={props.listHidden}
                ref={(element: HTMLDivElement | null) => registerScrollContainer("entries", element)}
            >
                {props.list}
            </Box>
            <Box
                component="section"
                className={cx("cf-reading-pane", classes.pane)}
                ref={(element: HTMLDivElement | null) => registerScrollContainer("readingPane", element)}
            >
                {props.pane}
            </Box>
        </Box>
    )
}
