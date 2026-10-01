import { describe, expect, it } from "vitest"
import { formatBytes, formatDuration } from "@/app/utils"

describe("formatBytes", () => {
    it("formats sizes with the right unit", () => {
        expect(formatBytes(512)).toBe("512 B")
        expect(formatBytes(2048)).toBe("2 KB")
        expect(formatBytes(343932928)).toBe("328 MB")
        expect(formatBytes(2.4 * 1024 ** 3)).toBe("2.4 GB")
    })
})

describe("formatDuration", () => {
    it("formats minutes and hours", () => {
        expect(formatDuration(48)).toBe("0:48")
        expect(formatDuration(1531)).toBe("25:31")
        expect(formatDuration(8076)).toBe("2:14:36")
    })
})
