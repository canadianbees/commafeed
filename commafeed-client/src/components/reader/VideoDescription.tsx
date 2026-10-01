import { Trans } from "@lingui/react/macro"
import { Box, Text } from "@mantine/core"
import { Fragment } from "react"
import { Content } from "@/components/content/Content"
import { cf } from "@/theme/tokens"
import { tss } from "@/tss"

const URL_PATTERN = /(https?:\/\/[^\s]+)/g

const useStyles = tss.create(() => ({
    text: {
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        lineHeight: 1.7,
        color: cf("text"),
        "& a": {
            color: cf("accent-text"),
        },
    },
}))

/** Plain text with its urls turned into links. Built as elements, the text is never parsed as html. */
export function LinkifiedText(props: Readonly<{ text: string }>) {
    // split with a capturing group: urls are at odd positions. Each part is keyed by its offset in the text.
    const parts: { offset: number; text: string; url: boolean }[] = []
    let offset = 0
    for (const [position, text] of props.text.split(URL_PATTERN).entries()) {
        parts.push({ offset, text, url: position % 2 === 1 })
        offset += text.length
    }
    return (
        <>
            {parts.map(part =>
                part.url ? (
                    <a key={part.offset} href={part.text} target="_blank" rel="noreferrer">
                        {part.text}
                    </a>
                ) : (
                    <Fragment key={part.offset}>{part.text}</Fragment>
                )
            )}
        </>
    )
}

/**
 * Description of a video: the full one from the video site when available, else what the feed provides.
 */
export function VideoDescription(
    props: Readonly<{
        description?: string
        loading: boolean
        feedDescription: string
        search?: string
    }>
) {
    const { classes, cx } = useStyles()

    if (props.description) {
        return (
            <Text component="div" className={cx("cf-content", "cf-video-description", classes.text)}>
                <LinkifiedText text={props.description} />
            </Text>
        )
    }

    if (props.loading) {
        return (
            <Text size="sm" c={cf("text-muted")}>
                <Trans>Loading description…</Trans>
            </Text>
        )
    }

    if (props.feedDescription) {
        return (
            <Box className={cx("cf-content", "cf-video-description")}>
                <Content content={props.feedDescription} highlight={props.search} />
            </Box>
        )
    }

    return null
}
