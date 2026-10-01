import { Trans } from "@lingui/react/macro"
import {
    Box,
    Divider,
    Group,
    type MantineColorScheme,
    Menu,
    SegmentedControl,
    type SegmentedControlItem,
    Slider,
    useMantineColorScheme,
} from "@mantine/core"
import { showNotification } from "@mantine/notifications"
import dayjs from "dayjs"
import { type ReactNode, useEffect, useState } from "react"
import {
    TbChartLine,
    TbHeartFilled,
    TbHelp,
    TbLayoutColumns,
    TbLayoutList,
    TbLayoutRows,
    TbList,
    TbListDetails,
    TbMoon,
    TbNotes,
    TbPaint,
    TbPalette,
    TbPower,
    TbSettings,
    TbSun,
    TbSunMoon,
    TbUsers,
    TbWorldDownload,
} from "react-icons/tb"
import { throttle } from "throttle-debounce"
import { client } from "@/app/client"
import { redirectToAbout, redirectToAdminUsers, redirectToDonate, redirectToMetrics, redirectToSettings } from "@/app/redirect/thunks"
import { useAppDispatch, useAppSelector } from "@/app/store"
import type { Layout, Theme, ViewMode } from "@/app/types"
import { setFontSizePercentage, setLayout, setTheme, setViewMode } from "@/app/user/slice"
import { reloadProfile } from "@/app/user/thunks"
import { useLayoutMode } from "@/hooks/useLayoutMode"
import { useNow } from "@/hooks/useNow"

interface ProfileMenuProps {
    control: React.ReactElement
}

const ProfileMenuControlItem = ({ icon, label }: { icon: ReactNode; label: ReactNode }) => {
    return (
        <Group>
            {icon}
            <Box ml={6}>{label}</Box>
        </Group>
    )
}

const iconSize = 16

interface ColorSchemeControlItem extends SegmentedControlItem {
    value: MantineColorScheme
}

const colorSchemeData: ColorSchemeControlItem[] = [
    {
        value: "light",
        label: <ProfileMenuControlItem icon={<TbSun size={iconSize} />} label={<Trans>Light</Trans>} />,
    },
    {
        value: "dark",
        label: <ProfileMenuControlItem icon={<TbMoon size={iconSize} />} label={<Trans>Dark</Trans>} />,
    },
    {
        value: "auto",
        label: <ProfileMenuControlItem icon={<TbSunMoon size={iconSize} />} label={<Trans>System</Trans>} />,
    },
]

interface ViewModeControlItem extends SegmentedControlItem {
    value: ViewMode
}

const viewModeData: ViewModeControlItem[] = [
    {
        value: "title",
        label: <ProfileMenuControlItem icon={<TbList size={iconSize} />} label={<Trans>Compact</Trans>} />,
    },
    {
        value: "cozy",
        label: <ProfileMenuControlItem icon={<TbLayoutList size={iconSize} />} label={<Trans>Cozy</Trans>} />,
    },
    {
        value: "detailed",
        label: <ProfileMenuControlItem icon={<TbListDetails size={iconSize} />} label={<Trans>Detailed</Trans>} />,
    },
    {
        value: "expanded",
        label: <ProfileMenuControlItem icon={<TbNotes size={iconSize} />} label={<Trans>Expanded</Trans>} />,
    },
]

interface LayoutControlItem extends SegmentedControlItem {
    value: Layout
}

const layoutData: LayoutControlItem[] = [
    {
        value: "inline",
        label: <ProfileMenuControlItem icon={<TbLayoutRows size={iconSize} />} label={<Trans>Inline</Trans>} />,
    },
    {
        value: "readingPane",
        label: <ProfileMenuControlItem icon={<TbLayoutColumns size={iconSize} />} label={<Trans>Reading pane</Trans>} />,
    },
]

interface StyleControlItem extends SegmentedControlItem {
    value: Theme
}

const styleData: StyleControlItem[] = [
    {
        value: "default",
        label: <ProfileMenuControlItem icon={<TbPalette size={iconSize} />} label={<Trans>Default</Trans>} />,
    },
    {
        value: "sand",
        label: <ProfileMenuControlItem icon={<TbPaint size={iconSize} />} label={<Trans>Sand</Trans>} />,
    },
]

export function ProfileMenu(props: Readonly<ProfileMenuProps>) {
    const [opened, setOpened] = useState(false)

    // close profile menu on scroll
    useEffect(() => {
        const listener = throttle(100, () => setOpened(false))
        window.addEventListener("scroll", listener)
        return () => window.removeEventListener("scroll", listener)
    }, [])

    const now = useNow()
    const profile = useAppSelector(state => state.user.profile)
    const admin = useAppSelector(state => state.user.profile?.admin)
    const viewMode = useAppSelector(state => state.user.localSettings.viewMode)
    const layout = useAppSelector(state => state.user.localSettings.layout)
    const theme = useAppSelector(state => state.user.localSettings.theme)
    const layoutMode = useLayoutMode()
    const forceRefreshCooldownDuration = useAppSelector(state => state.server.serverInfos?.forceRefreshCooldownDuration)
    const fontSizePercentage = useAppSelector(state => state.user.localSettings.fontSizePercentage)
    const dispatch = useAppDispatch()
    const { colorScheme, setColorScheme } = useMantineColorScheme()

    const nextAvailableForceRefresh = profile?.lastForceRefresh
        ? profile.lastForceRefresh + (forceRefreshCooldownDuration ?? 0)
        : now.getTime()
    const forceRefreshEnabled = nextAvailableForceRefresh <= now.getTime()

    const logout = () => {
        window.location.href = "logout"
    }

    return (
        <Menu position="bottom-end" closeOnItemClick={false} opened={opened} onChange={setOpened} preventPositionChangeWhenVisible={false}>
            <Menu.Target>{props.control}</Menu.Target>
            <Menu.Dropdown>
                {profile && <Menu.Label>{profile.name}</Menu.Label>}
                <Menu.Item
                    leftSection={<TbSettings size={iconSize} />}
                    onClick={() => {
                        dispatch(redirectToSettings())
                        setOpened(false)
                    }}
                >
                    <Trans>Settings</Trans>
                </Menu.Item>
                <Menu.Item
                    leftSection={<TbWorldDownload size={iconSize} />}
                    disabled={!forceRefreshEnabled}
                    onClick={async () => {
                        setOpened(false)

                        try {
                            await client.feed.refreshAll()

                            // reload profile to update last force refresh timestamp
                            await dispatch(reloadProfile())

                            showNotification({
                                message: <Trans>Your feeds have been queued for refresh.</Trans>,
                                color: "green",
                                autoClose: 1000,
                            })
                        } catch {
                            showNotification({
                                message: <Trans>Force fetching feeds is not yet available.</Trans>,
                                color: "red",
                                autoClose: 2000,
                            })
                        }
                    }}
                >
                    <Trans>Fetch all my feeds now</Trans>
                    {!forceRefreshEnabled && <span> ({dayjs.duration(nextAvailableForceRefresh - now.getTime()).format("HH:mm:ss")})</span>}
                </Menu.Item>

                <Divider />

                <Menu.Label>
                    <Trans>Theme</Trans>
                </Menu.Label>
                <SegmentedControl
                    fullWidth
                    orientation="vertical"
                    data={colorSchemeData}
                    value={colorScheme}
                    onChange={e => setColorScheme(e as MantineColorScheme)}
                    mb="xs"
                />
                <SegmentedControl fullWidth data={styleData} value={theme} onChange={e => dispatch(setTheme(e as Theme))} mb="xs" />

                <Divider />

                <Menu.Label>
                    <Trans>Display</Trans>
                </Menu.Label>
                {
                    <SegmentedControl
                        fullWidth
                        orientation="vertical"
                        data={layoutData}
                        value={layout}
                        onChange={e => dispatch(setLayout(e as Layout))}
                        mb="xs"
                    />
                }
                {layoutMode === "inline" && (
                    <SegmentedControl
                        fullWidth
                        orientation="vertical"
                        data={viewModeData}
                        value={viewMode}
                        onChange={e => dispatch(setViewMode(e as ViewMode))}
                        mb="xs"
                    />
                )}

                <Divider />

                <Menu.Label>
                    <Trans>Font size</Trans>
                </Menu.Label>
                <Slider
                    min={50}
                    max={150}
                    step={5}
                    marks={[{ value: 100 }]}
                    label={v => `${v}%`}
                    mb="xs"
                    value={fontSizePercentage}
                    onChange={value => dispatch(setFontSizePercentage(value))}
                />

                {admin && (
                    <>
                        <Divider />
                        <Menu.Label>
                            <Trans>Admin</Trans>
                        </Menu.Label>
                        <Menu.Item
                            leftSection={<TbUsers size={iconSize} />}
                            onClick={() => {
                                dispatch(redirectToAdminUsers())
                                setOpened(false)
                            }}
                        >
                            <Trans>Manage users</Trans>
                        </Menu.Item>
                        <Menu.Item
                            leftSection={<TbChartLine size={iconSize} />}
                            onClick={() => {
                                dispatch(redirectToMetrics())
                                setOpened(false)
                            }}
                        >
                            <Trans>Metrics</Trans>
                        </Menu.Item>
                    </>
                )}

                <Divider />

                <Menu.Item
                    leftSection={<TbHeartFilled size={iconSize} color="red" />}
                    onClick={() => {
                        dispatch(redirectToDonate())
                        setOpened(false)
                    }}
                >
                    <Trans>Donate</Trans>
                </Menu.Item>

                <Menu.Item
                    leftSection={<TbHelp size={iconSize} />}
                    onClick={() => {
                        dispatch(redirectToAbout())
                        setOpened(false)
                    }}
                >
                    <Trans>About</Trans>
                </Menu.Item>
                <Menu.Item leftSection={<TbPower size={iconSize} />} onClick={logout}>
                    <Trans>Logout</Trans>
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    )
}
