import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

export interface MediaResult {
  success: boolean
  data?: any
  error?: string
}

// Media control
export async function mediaPlayPause(): Promise<MediaResult> {
  try {
    await execAsync('powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]179)"')
    return { success: true, data: { action: 'play/pause' } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function mediaNext(): Promise<MediaResult> {
  try {
    await execAsync('powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]176)"')
    return { success: true, data: { action: 'next' } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function mediaPrevious(): Promise<MediaResult> {
  try {
    await execAsync('powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]177)"')
    return { success: true, data: { action: 'previous' } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function mediaStop(): Promise<MediaResult> {
  try {
    await execAsync('powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]178)"')
    return { success: true, data: { action: 'stop' } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function volumeUp(amount: number = 10): Promise<MediaResult> {
  try {
    for (let i = 0; i < Math.ceil(amount / 2); i++) {
      await execAsync('powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"')
    }
    return { success: true, data: { action: 'volumeUp', amount } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function volumeDown(amount: number = 10): Promise<MediaResult> {
  try {
    for (let i = 0; i < Math.ceil(amount / 2); i++) {
      await execAsync('powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]174)"')
    }
    return { success: true, data: { action: 'volumeDown', amount } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function volumeMute(): Promise<MediaResult> {
  try {
    await execAsync('powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"')
    return { success: true, data: { action: 'mute' } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function setVolume(level: number): Promise<MediaResult> {
  try {
    const script = `
      $volume = [math]::Round(${level} / 100 * 65535)
      $obj = New-Object -ComObject WScript.Shell
      for ($i = 0; $i -lt 50; $i++) { $obj.SendKeys([char]174) }
      $steps = [math]::Round(${level} / 2)
      for ($i = 0; $i -lt $steps; $i++) { $obj.SendKeys([char]175) }
    `
    await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
    return { success: true, data: { level } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Screen control
export async function setBrightness(level: number): Promise<MediaResult> {
  try {
    const script = `
      (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${level})
    `
    await execAsync(`powershell -Command "${script}"`)
    return { success: true, data: { brightness: level } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getBrightness(): Promise<MediaResult> {
  try {
    const { stdout } = await execAsync('powershell -Command "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness).CurrentBrightness"')
    return { success: true, data: { brightness: parseInt(stdout.trim()) } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Power control
export async function shutdown(delay: number = 0): Promise<MediaResult> {
  try {
    await execAsync(`shutdown /s /t ${delay}`)
    return { success: true, data: { action: 'shutdown', delay } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function restart(delay: number = 0): Promise<MediaResult> {
  try {
    await execAsync(`shutdown /r /t ${delay}`)
    return { success: true, data: { action: 'restart', delay } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function sleep(): Promise<MediaResult> {
  try {
    await execAsync('rundll32.exe powrprof.dll,SetSuspendState 0,1,0')
    return { success: true, data: { action: 'sleep' } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function lock(): Promise<MediaResult> {
  try {
    await execAsync('rundll32.exe user32.dll,LockWorkStation')
    return { success: true, data: { action: 'lock' } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function cancelShutdown(): Promise<MediaResult> {
  try {
    await execAsync('shutdown /a')
    return { success: true, data: { action: 'cancelShutdown' } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Record audio
export async function recordAudio(durationSeconds: number, outputPath?: string): Promise<MediaResult> {
  try {
    const filePath = outputPath || path.join(os.homedir(), 'Downloads', `recording_${Date.now()}.wav`)
    const script = `
      Add-Type -AssemblyName System.Speech
      $rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine
      $rec.SetInputToDefaultAudioDevice()
      # Recording for ${durationSeconds} seconds
      Start-Sleep -Seconds ${durationSeconds}
    `
    // Note: Full audio recording requires additional libraries
    // This is a simplified version
    return { success: false, error: 'Audio recording requires additional setup' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
