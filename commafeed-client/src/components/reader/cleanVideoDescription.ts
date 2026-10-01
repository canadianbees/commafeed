const EMBED_HOSTS = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be|tiktok\.com)$/i

const isVideoSiteEmbed = (iframe: HTMLIFrameElement) => {
    try {
        return EMBED_HOSTS.test(new URL(iframe.getAttribute("src") ?? "", "https://invalid").hostname)
    } catch {
        return false
    }
}

/**
 * Removes the video site's own player and the thumbnails from the description of a downloadable video, since CommaFeed
 * shows its own player above it. Elements left empty afterwards are removed too.
 */
export const cleanVideoDescription = (html: string | undefined): string => {
    if (!html) return ""

    const doc = new DOMParser().parseFromString(html, "text/html")
    for (const iframe of Array.from(doc.querySelectorAll("iframe"))) {
        if (isVideoSiteEmbed(iframe)) iframe.remove()
    }
    for (const media of Array.from(doc.querySelectorAll("img, picture, video"))) {
        media.remove()
    }

    // remove wrappers that only held the removed elements, deepest first
    for (const element of Array.from(doc.body.querySelectorAll("p, a, figure, div, span")).reverse()) {
        if (!element.textContent?.trim() && element.children.length === 0) element.remove()
    }
    // leading and trailing line breaks left behind by removed elements
    while (doc.body.firstElementChild?.tagName === "BR") doc.body.firstElementChild.remove()
    while (doc.body.lastElementChild?.tagName === "BR") doc.body.lastElementChild.remove()

    return doc.body.innerHTML.trim()
}
