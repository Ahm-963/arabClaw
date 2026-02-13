import { desktopCapturer, screen } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

export interface ScreenshotResult {
  success: boolean
  filePath?: string
  error?: string
}

export async function takeScreenshot(
  outputPath?: string,
  displayId?: number
): Promise<ScreenshotResult> {
  try {
    const displays = screen.getAllDisplays()
    const targetDisplay = displayId !== undefined 
      ? displays.find(d => d.id === displayId) || displays[0]
      : displays[0]

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: targetDisplay.size.width,
        height: targetDisplay.size.height
      }
    })

    if (sources.length === 0) {
      return { success: false, error: 'No screen sources found' }
    }

    const source = sources[0]
    const thumbnail = source.thumbnail
    const pngBuffer = thumbnail.toPNG()

    // Default output path
    const defaultDir = path.join(os.homedir(), 'Downloads')
    const fileName = `screenshot_${Date.now()}.png`
    const filePath = outputPath || path.join(defaultDir, fileName)

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, pngBuffer)

    console.log('[Screenshot] Saved to:', filePath)
    return { success: true, filePath }
  } catch (error: any) {
    console.error('[Screenshot] Error:', error.message)
    return { success: false, error: error.message }
  }
}

export async function getDisplays(): Promise<{ id: number; name: string; size: { width: number; height: number } }[]> {
  const displays = screen.getAllDisplays()
  return displays.map((d, i) => ({
    id: d.id,
    name: `Display ${i + 1}`,
    size: d.size
  }))
}
