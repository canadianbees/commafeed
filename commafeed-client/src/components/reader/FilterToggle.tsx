import { msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"
import { SegmentedControl } from "@mantine/core"
import { reloadEntries } from "@/app/entries/thunks"
import { useAppDispatch, useAppSelector } from "@/app/store"
import type { ReadingMode } from "@/app/types"
import { changeSettings } from "@/app/user/thunks"
import { cf } from "@/theme/tokens"
import { tss } from "@/tss"

const useStyles = tss.create(() => ({
    root: {
        background: cf("surface"),
        border: `1px solid ${cf("border")}`,
    },
    indicator: {
        background: cf("text"),
    },
    label: {
        color: cf("text"),
        "&[data-active]": {
            color: cf("bg"),
        },
    },
}))

/** Switches the entry list between unread and all entries (the "reading mode" setting). */
export function FilterToggle(props: Readonly<{ fullWidth?: boolean }>) {
    const readingMode = useAppSelector(state => state.user.settings?.readingMode)
    const dispatch = useAppDispatch()
    const { _ } = useLingui()
    const { classes } = useStyles()

    if (!readingMode) return null

    const change = async (value: string) => {
        await dispatch(changeSettings({ readingMode: value as ReadingMode }))
        dispatch(reloadEntries())
    }

    return (
        <SegmentedControl
            className="cf-filter-toggle"
            classNames={{ root: classes.root, indicator: classes.indicator, label: classes.label }}
            size={props.fullWidth ? "sm" : "xs"}
            fullWidth={props.fullWidth}
            radius={cf("radius")}
            value={readingMode}
            onChange={change}
            data={[
                { value: "unread", label: _(msg`Unread`) },
                { value: "all", label: _(msg`All`) },
            ]}
        />
    )
}
