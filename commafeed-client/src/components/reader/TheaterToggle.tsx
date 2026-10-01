import { Trans } from "@lingui/react/macro"
import { Button, Tooltip } from "@mantine/core"
import { TbArrowsMaximize, TbArrowsMinimize } from "react-icons/tb"
import { Constants } from "@/app/constants"
import { useAppDispatch, useAppSelector } from "@/app/store"
import { setTheater } from "@/app/videos/slice"
import { cf } from "@/theme/tokens"

/** Turns theater mode on and off (keyboard: t). */
export function TheaterToggle() {
    const theater = useAppSelector(state => state.videos.theater)
    const dispatch = useAppDispatch()
    return (
        <Tooltip label={<Trans>Keyboard shortcut: t</Trans>} openDelay={Constants.tooltip.delay}>
            <Button
                className="cf-theater-toggle"
                variant="default"
                size="xs"
                radius={cf("radius")}
                leftSection={theater ? <TbArrowsMinimize size={14} /> : <TbArrowsMaximize size={14} />}
                aria-pressed={theater}
                onClick={() => dispatch(setTheater(!theater))}
            >
                {theater ? <Trans>Exit theater</Trans> : <Trans>Theater</Trans>}
            </Button>
        </Tooltip>
    )
}
