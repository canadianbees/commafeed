import type { CSSVariablesResolver, MantineColorsTuple } from "@mantine/core"
import type { Theme } from "@/app/types"

/**
 * Design tokens used by the reader components, exposed as `--cf-<name>` css variables.
 *
 * Components read them with {@link cf} so that every theme, in light and dark mode, only needs a new set of values here.
 */
export type TokenName =
    | "bg"
    | "surface"
    | "surface-selected"
    | "border"
    | "text"
    | "text-muted"
    | "subtitle"
    | "accent"
    | "accent-text"
    | "on-accent"
    | "video"
    | "video-text"
    | "on-video"
    | "header-bg"
    | "header-border"
    | "header-text"
    | "header-icon"
    | "sidebar-bg"
    | "sidebar-border"
    | "sidebar-text"
    | "sidebar-heading"
    | "sidebar-active-bg"
    | "sidebar-input-bg"
    | "radius"

type Tokens = Record<TokenName, string>

export const cf = (name: TokenName) => `var(--cf-${name})`

// default theme: follow mantine's own colors so the reader components match the rest of the app in light and dark mode
const defaultTokens: Tokens = {
    bg: "var(--mantine-color-body)",
    surface: "var(--mantine-color-default)",
    "surface-selected": "var(--mantine-color-default-hover)",
    border: "var(--mantine-color-default-border)",
    text: "var(--mantine-color-text)",
    "text-muted": "var(--mantine-color-dimmed)",
    subtitle: "var(--mantine-color-dimmed)",
    accent: "var(--mantine-primary-color-filled)",
    "accent-text": "var(--mantine-color-anchor)",
    "on-accent": "var(--mantine-primary-color-contrast)",
    video: "var(--mantine-color-blue-filled)",
    "video-text": "var(--mantine-color-blue-text)",
    "on-video": "var(--mantine-color-white)",
    "header-bg": "var(--mantine-color-body)",
    "header-border": "var(--mantine-color-default-border)",
    "header-text": "var(--mantine-color-text)",
    "header-icon": "var(--mantine-color-text)",
    "sidebar-bg": "var(--mantine-color-body)",
    "sidebar-border": "var(--mantine-color-default-border)",
    "sidebar-text": "var(--mantine-color-text)",
    "sidebar-heading": "var(--mantine-color-text)",
    "sidebar-active-bg": "var(--mantine-color-default-hover)",
    "sidebar-input-bg": "var(--mantine-color-default)",
    radius: "var(--mantine-radius-sm)",
}

const sandLight: Tokens = {
    bg: "#f3d9b1",
    surface: "#fae8c8",
    "surface-selected": "#eac99a",
    border: "#c29979",
    text: "#0a0a0a",
    "text-muted": "#3a5a4a",
    subtitle: "#064f28",
    accent: "#a22522",
    "accent-text": "#a22522",
    "on-accent": "#f3d9b1",
    video: "#2b5f8a",
    "video-text": "#2b5f8a",
    "on-video": "#f3d9b1",
    "header-bg": "#0a0a0a",
    "header-border": "#c29979",
    "header-text": "#f3d9b1",
    "header-icon": "#c29979",
    "sidebar-bg": "#064f28",
    "sidebar-border": "#053d1f",
    "sidebar-text": "#a8c9b0",
    "sidebar-heading": "#f3d9b1",
    "sidebar-active-bg": "#053d1f",
    "sidebar-input-bg": "#053d1f",
    radius: "2px",
}

const sandDark: Tokens = {
    ...sandLight,
    bg: "#1a1208",
    surface: "#221808",
    "surface-selected": "#2e2010",
    border: "#4a3520",
    text: "#f3d9b1",
    "text-muted": "#a8c9b0",
    subtitle: "#a8c9b0",
    // lighter red and blue so that text stays readable on the dark background
    "accent-text": "#e8736e",
    "video-text": "#8cb8de",
    "header-border": "#4a3520",
    "sidebar-bg": "#0a0a0a",
    "sidebar-border": "#4a3520",
    "sidebar-active-bg": "#1a1208",
    "sidebar-input-bg": "#111111",
}

export const sandRed: MantineColorsTuple = [
    "#fbeaea",
    "#f2cdcc",
    "#e6a09e",
    "#d9716e",
    "#cc4a47",
    "#bb3431",
    "#a22522",
    "#8a1f1d",
    "#7a1a18",
    "#621412",
]

const toCssVariables = (tokens: Tokens) =>
    Object.fromEntries(Object.entries(tokens).map(([name, value]) => [`--cf-${name}`, value])) as Record<string, string>

/** Wraps a mantine css variables resolver to also expose the tokens of the given theme. */
export const withThemeTokens =
    (resolver: CSSVariablesResolver, theme: Theme): CSSVariablesResolver =>
    mantineTheme => {
        const resolved = resolver(mantineTheme)
        const light = theme === "sand" ? sandLight : defaultTokens
        const dark = theme === "sand" ? sandDark : defaultTokens
        return {
            variables: resolved.variables,
            light: { ...resolved.light, ...toCssVariables(light) },
            dark: { ...resolved.dark, ...toCssVariables(dark) },
        }
    }
