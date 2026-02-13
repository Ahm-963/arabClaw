import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import * as os from 'os'

export interface DownloadResult {
  success: boolean
  filePath?: string
  error?: string
}

export async function downloadFile(
  url: string,
  filename?: string,
  outputDir?: string
): Promise<DownloadResult> {
  try {
    console.log('[Download] Downloading:', url)
    
    // Default output directory - use user's Downloads folder
    const defaultDir = path.join(os.homedir(), 'Downloads')
    const targetDir = outputDir || defaultDir
    
    // Ensure directory exists
    await fs.mkdir(targetDir, { recursive: true })
    
    // Fetch the file
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`)
    }
    
    // Determine filename
    let finalFilename = filename
    
    if (!finalFilename) {
      // Try to get from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition')
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";\n]+)"?/)
        if (match) {
          finalFilename = match[1]
        }
      }
      
      // Fall back to URL
      if (!finalFilename) {
        const urlPath = new URL(url).pathname
        finalFilename = path.basename(urlPath) || `download_${Date.now()}`
      }
    }
    
    const filePath = path.join(targetDir, finalFilename)
    
    // Get buffer and write
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.writeFile(filePath, buffer)
    
    console.log('[Download] Saved to:', filePath)
    
    return { success: true, filePath }
  } catch (error: any) {
    console.error('[Download] Error:', error.message)
    return { success: false, error: error.message }
  }
}
