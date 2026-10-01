import { Box, Group, Title } from "@mantine/core"
import type { ReactNode } from "react"
import { cf } from "@/theme/tokens"
import { tss } from "@/tss"

const useStyles = tss.create(() => ({
    root: {
        paddingBottom: 8,
        borderBottom: `1px solid ${cf("border")}`,
        color: cf("text"),
    },
    title: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        letterSpacing: "0.02em",
    },
    bar: {
        display: "block",
        width: 40,
        height: 2,
        marginTop: 6,
        background: cf("accent"),
    },
}))

/** Title of a column, with a short accent bar underneath and optional actions on the right. */
export function SectionTitle(
    props: Readonly<{
        children: ReactNode
        actions?: ReactNode
    }>
) {
    const { classes, cx } = useStyles()
    return (
        <Box className={cx("cf-entries-title", classes.root)}>
            <Group justify="space-between" wrap="nowrap" gap="xs">
                <Title order={2} fz={24} fw={700} className={classes.title}>
                    {props.children}
                </Title>
                {props.actions && (
                    <Group gap={4} wrap="nowrap">
                        {props.actions}
                    </Group>
                )}
            </Group>
            <span className={classes.bar} aria-hidden="true" />
        </Box>
    )
}
