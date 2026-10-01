import { Box } from "@mantine/core"
import type { ReactNode } from "react"
import { cf } from "@/theme/tokens"
import { tss } from "@/tss"

// videos are always shown on a dark background, whatever the theme and color scheme
export const VIDEO_FRAME_BACKGROUND = "#0a0a0a"
export const VIDEO_FRAME_TEXT = "#f3ead9"

const useStyles = tss.create(() => ({
    frame: {
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        boxSizing: "border-box",
        background: VIDEO_FRAME_BACKGROUND,
        color: VIDEO_FRAME_TEXT,
        border: `2px solid ${cf("text")}`,
        borderRadius: cf("radius"),
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        "& video": {
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
        },
    },
}))

/** A 16:9 dark frame holding a video player, or what stands in for it while the video isn't available. */
export function VideoFrame(props: Readonly<{ children: ReactNode }>) {
    const { classes, cx } = useStyles()
    return <Box className={cx("cf-video-frame", classes.frame)}>{props.children}</Box>
}
