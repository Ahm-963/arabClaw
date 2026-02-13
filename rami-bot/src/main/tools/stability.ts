import { takeScreenshot } from './vision'
import { Jimp } from 'jimp'

/**
 * Wait for the screen to become stable (no significant visual changes)
 * @param timeout Maximum time to wait in ms
 * @param interval Check interval in ms
 * @returns Success if screen is stable
 */
export async function waitForQuiet(timeout: number = 5000, interval: number = 1000): Promise<{ success: boolean; error?: string }> {
    const start = Date.now()
    let lastScreenshot: string | null = null

    while (Date.now() - start < timeout) {
        const shot = await takeScreenshot()
        if (!shot.success || !shot.data) return { success: false, error: 'Failed to take screenshot' }

        if (lastScreenshot) {
            if (lastScreenshot === shot.data) {
                return { success: true }
            }
        }

        lastScreenshot = shot.data
        await new Promise(r => setTimeout(r, interval))
    }

    return { success: false, error: 'Timeout reached before screen stabilized' }
}
