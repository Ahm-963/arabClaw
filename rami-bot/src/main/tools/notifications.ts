import { Notification, shell } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface NotificationResult {
  success: boolean
  data?: any
  error?: string
}

export async function showNotification(
  title: string,
  body: string,
  options?: {
    icon?: string
    silent?: boolean
    urgency?: 'normal' | 'critical' | 'low'
    onClick?: () => void
  }
): Promise<NotificationResult> {
  try {
    const notification = new Notification({
      title,
      body,
      icon: options?.icon,
      silent: options?.silent,
      urgency: options?.urgency
    })

    if (options?.onClick) {
      notification.on('click', options.onClick)
    }

    notification.show()
    return { success: true, data: { title, body } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function playSound(soundPath?: string): Promise<NotificationResult> {
  try {
    if (soundPath) {
      await execAsync(`powershell -Command "(New-Object Media.SoundPlayer '${soundPath}').PlaySync()"`)
    } else {
      // Default Windows notification sound
      await execAsync('powershell -Command "[System.Media.SystemSounds]::Asterisk.Play()"')
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function speak(text: string, voice?: string): Promise<NotificationResult> {
  try {
    const escapedText = text.replace(/'/g, "''")
    const voiceParam = voice ? `-Voice '${voice}'` : ''
    await execAsync(`powershell -Command "Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.Speak('${escapedText}')"`)
    return { success: true, data: { text } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getVoices(): Promise<NotificationResult> {
  try {
    const { stdout } = await execAsync('powershell -Command "Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }"')
    const voices = stdout.trim().split('\n').filter(v => v.trim())
    return { success: true, data: voices }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function openUrl(url: string): Promise<NotificationResult> {
  try {
    await shell.openExternal(url)
    return { success: true, data: { url } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function openPath(filePath: string): Promise<NotificationResult> {
  try {
    await shell.openPath(filePath)
    return { success: true, data: { path: filePath } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function showInFolder(filePath: string): Promise<NotificationResult> {
  try {
    shell.showItemInFolder(filePath)
    return { success: true, data: { path: filePath } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function setReminder(
  message: string,
  delayMs: number
): Promise<NotificationResult> {
  try {
    setTimeout(() => {
      showNotification('⏰ Reminder', message, { urgency: 'critical' })
      playSound()
    }, delayMs)
    
    const reminderTime = new Date(Date.now() + delayMs)
    return { 
      success: true, 
      data: { 
        message, 
        willFireAt: reminderTime.toISOString(),
        delayMs 
      } 
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
