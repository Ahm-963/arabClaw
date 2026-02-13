import { shell } from 'electron'
import { exec } from 'child_process'
import { platform } from 'os'

export async function openBrowser(url: string): Promise<boolean> {
    try {
        // If it's a LinkedIn post request (heuristic), we can try to open the share URL
        if (url.includes('linkedin.com') && (url.includes('share') || url.includes('post'))) {
            // Just open the standard feed or share page for now, as direct posting via URL is limited
            // Use the official share intent if possible: https://www.linkedin.com/sharing/share-offsite/?url={url}
            // But for status updates, it's usually https://www.linkedin.com/feed/ with text pasted.
            // Since we can't paste easily without automation (Puppeteer), we'll open the page 
            // and let the agent use Computer Control to paste.
        }

        await shell.openExternal(url)
        return true
    } catch (error) {
        console.error('[Browser] Failed to open URL:', error)
        return false
    }
}

export async function googleSearch(query: string): Promise<boolean> {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`
    return await openBrowser(url)
}
