import { Group } from "@mantine/core"
import type { ReactNode } from "react"
import { cf } from "@/theme/tokens"
import { tss } from "@/tss"

const useStyles = tss.create(() => ({
    bar: {
        position: "sticky",
        // above the footer when the header is at the bottom of the screen (mobile footer setting)
        bottom: "var(--app-shell-footer-offset, 0px)",
        zIndex: 2,
        // cancel the padding of the app shell on phones so the bar spans the whole width
        marginInline: -6,
        padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
        background: cf("bg"),
        borderTop: `1px solid ${cf("border")}`,
    },
}))

/** Primary actions at the bottom of the screen on phones, where they are easy to reach. */
export function BottomActionBar(props: Readonly<{ children: ReactNode }>) {
    const { classes, cx } = useStyles()
    return (
        <Group className={cx("cf-bottom-action-bar", classes.bar)} gap="sm" wrap="nowrap">
            {props.children}
        </Group>
    )
}
