import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { app } from 'electron'

const execAsync = promisify(exec)

export interface VoiceResult {
  success: boolean
  data?: any
  error?: string
}

import { elevenLabsService } from '../services/elevenlabs'
import { settingsManager } from '../settings'

// Text-to-Speech using Windows SAPI or ElevenLabs
export async function speak(
  text: string,
  options?: {
    voice?: string
    rate?: number // -10 to 10
    volume?: number // 0 to 100
    async?: boolean
  }
): Promise<VoiceResult> {
  try {
    const settings = settingsManager.getSettingsSync()
    const provider = settings.voiceProvider || 'system'

    // --- ELEVENLABS IMPLEMENTATION ---
    if (provider === 'elevenlabs' && settings.elevenLabsApiKey) {
      // Use default voice if not specified
      const voiceId = options?.voice || '21m00Tcm4TlvDq8ikWAM' // Rachel default

      const filePath = await elevenLabsService.textToSpeech(text, voiceId)
      if (!filePath) {
        throw new Error('ElevenLabs failed to generate audio')
      }

      // Play the audio file using PowerShell (WPF MediaPlayer)
      const script = `
            Add-Type -AssemblyName PresentationCore
            $p = New-Object System.Windows.Media.MediaPlayer
            $p.Open('${filePath.replace(/\\/g, '\\\\')}')
            $p.Play()
            Start-Sleep -Seconds 1
            while ($p.Position -ne $p.NaturalDuration.TimeSpan) { Start-Sleep -Milliseconds 100 }
            $p.Close()
        `

      if (options?.async) {
        exec(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
        return { success: true, data: { text, provider: 'elevenlabs', async: true } }
      } else {
        await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
        return { success: true, data: { text, provider: 'elevenlabs' } }
      }
    }

    // --- SYSTEM (SAPI) IMPLEMENTATION ---
    const rate = options?.rate ?? 0
    const volume = options?.volume ?? 100
    const voiceSelect = options?.voice
      ? `$synth.SelectVoice('${options.voice}');`
      : ''

    const escapedText = text
      .replace(/'/g, "''")
      .replace(/\n/g, ' ')
      .replace(/"/g, '`"')

    const script = `
      Add-Type -AssemblyName System.Speech
      $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
      ${voiceSelect}
      $synth.Rate = ${rate}
      $synth.Volume = ${volume}
      $synth.Speak('${escapedText}')
    `

    if (options?.async) {
      // Non-blocking speech
      exec(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
      return { success: true, data: { text, async: true } }
    } else {
      await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
      return { success: true, data: { text } }
    }
  } catch (error: any) {
    console.error('[Voice] Speak error:', error.message)
    return { success: false, error: error.message }
  }
}

// Get available voices
export async function getVoices(): Promise<VoiceResult> {
  try {
    const settings = settingsManager.getSettingsSync()

    if (settings.voiceProvider === 'elevenlabs' && settings.elevenLabsApiKey) {
      const voices = await elevenLabsService.getVoices()
      // Map to common format
      const mapped = voices.map(v => ({
        Name: v.name,
        Id: v.voice_id,
        Culture: 'en-US', // Default mostly
        Gender: v.labels?.gender || 'unknown',
        Age: v.labels?.age || 'unknown',
        Provider: 'elevenlabs'
      }))
      return { success: true, data: mapped }
    }

    // System Voices
    const script = `
      Add-Type -AssemblyName System.Speech;
      $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
      $synth.GetInstalledVoices() | ForEach-Object {
        $info = $_.VoiceInfo;
        @{
          Name = $info.Name;
          Culture = $info.Culture.Name;
          Gender = $info.Gender.ToString();
          Age = $info.Age.ToString();
          Provider = 'system';
          Id = $info.Name 
        }
      } | ConvertTo-Json -Compress
    `
    const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`)
    const voices = JSON.parse(stdout || '[]')
    return { success: true, data: Array.isArray(voices) ? voices : [voices] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Find best matching voice for a country/language
export async function getBestVoiceForCountry(country: string): Promise<string | null> {
  const result = await getVoices()
  if (!result.success || !result.data) return null

  const voices = result.data as any[]
  const countryLower = country.toLowerCase()

  // 1. Try exact Culture match (e.g., "fr-FR" for France)
  // Map common countries to codes
  const codeMap: Record<string, string> = {
    'france': 'fr',
    'germany': 'de',
    'spain': 'es',
    'italy': 'it',
    'china': 'zh',
    'japan': 'ja',
    'russia': 'ru',
    'india': 'in',
    'us': 'en-US',
    'usa': 'en-US',
    'uk': 'en-GB',
    'britain': 'en-GB',
    'brazil': 'pt-BR'
  }

  const targetCode = codeMap[countryLower]

  if (targetCode) {
    const match = voices.find(v => v.Culture.toLowerCase().includes(targetCode.toLowerCase()))
    if (match) return match.Name
  }

  // 2. Try matching country name in Voice Name (e.g. "Microsoft Ravi" for India)
  // Common mappings of names to regions if not explicit in culture
  const nameMap: Record<string, string[]> = {
    'india': ['ravi', 'heera'],
    'france': ['hortense', 'julie', 'paul'],
    'germany': ['hedda', 'stefan'],
    'spain': ['helena', 'laura'],
    'italy': ['cosimo', 'elsa'],
    'china': ['huihui', 'yaoyao'],
    'japan': ['ayumi', 'haruka'],
  }

  const targetNames = nameMap[countryLower]
  if (targetNames) {
    const match = voices.find(v => targetNames.some(n => v.Name.toLowerCase().includes(n)))
    if (match) return match.Name
  }

  return null
}

// Save speech to audio file
export async function speakToFile(
  text: string,
  outputPath?: string,
  options?: {
    voice?: string
    rate?: number
    format?: 'wav' | 'mp3'
  }
): Promise<VoiceResult> {
  try {
    const rate = options?.rate ?? 0
    const format = options?.format ?? 'wav'
    const defaultPath = path.join(
      app?.getPath('userData') || os.tmpdir(),
      `speech_${Date.now()}.${format}`
    )
    const filePath = outputPath || defaultPath

    const escapedText = text.replace(/'/g, "''").replace(/\n/g, ' ')
    const voiceSelect = options?.voice
      ? `$synth.SelectVoice('${options.voice}');`
      : ''

    const script = `
      Add-Type -AssemblyName System.Speech
      $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
      ${voiceSelect}
      $synth.Rate = ${rate}
      $synth.SetOutputToWaveFile('${filePath.replace(/\\/g, '\\\\')}')
      $synth.Speak('${escapedText}')
      $synth.SetOutputToDefaultAudioDevice()
    `

    await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)

    return { success: true, data: { filePath, text } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Speech recognition (listen for voice input)
export async function listen(
  duration?: number // seconds
): Promise<VoiceResult> {
  try {
    const timeout = duration || 10

    const script = `
      Add-Type -AssemblyName System.Speech
      $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
      $recognizer.SetInputToDefaultAudioDevice()
      $grammar = New-Object System.Speech.Recognition.DictationGrammar
      $recognizer.LoadGrammar($grammar)
      $result = $recognizer.Recognize([TimeSpan]::FromSeconds(${timeout}))
      if ($result) {
        $result.Text
      } else {
        ""
      }
    `

    const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`, {
      timeout: (timeout + 5) * 1000
    })

    const recognizedText = stdout.trim()

    if (recognizedText) {
      return { success: true, data: { text: recognizedText } }
    } else {
      return { success: false, error: 'No speech detected' }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Stop any ongoing speech
export async function stopSpeaking(): Promise<VoiceResult> {
  try {
    const script = `
      Add-Type -AssemblyName System.Speech
      $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
      $synth.SpeakAsyncCancelAll()
    `
    await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Check if currently speaking
export async function isSpeaking(): Promise<VoiceResult> {
  try {
    const script = `
      Add-Type -AssemblyName System.Speech
      $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
      $synth.State.ToString()
    `
    const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
    const state = stdout.trim()
    return { success: true, data: { speaking: state === 'Speaking', state } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Read clipboard content aloud
export async function readClipboard(): Promise<VoiceResult> {
  try {
    const { stdout } = await execAsync('powershell -Command "Get-Clipboard"')
    const text = stdout.trim()

    if (!text) {
      return { success: false, error: 'Clipboard is empty' }
    }

    await speak(text)
    return { success: true, data: { text } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Read selected text aloud (simulates Ctrl+C then speaks)
export async function readSelected(): Promise<VoiceResult> {
  try {
    // Copy selected text
    await execAsync('powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^c\')"')

    // Wait a bit for clipboard to update
    await new Promise(resolve => setTimeout(resolve, 200))

    // Read clipboard
    return await readClipboard()
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Pronounce text with phonetic breakdown
export async function pronounce(word: string): Promise<VoiceResult> {
  try {
    // Speak slowly with pauses between syllables
    const slowText = word.split('').join(' ')
    await speak(slowText, { rate: -5 })

    // Then speak normally
    await new Promise(resolve => setTimeout(resolve, 500))
    await speak(word, { rate: 0 })

    return { success: true, data: { word } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Voice feedback for notifications
export async function voiceNotification(
  title: string,
  message: string
): Promise<VoiceResult> {
  try {
    const text = `${title}. ${message}`
    await speak(text, { rate: 1, async: true })
    return { success: true, data: { title, message } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Conversation mode - read responses aloud
let conversationMode = false

export function enableConversationMode(): void {
  conversationMode = true
}

export function disableConversationMode(): void {
  conversationMode = false
}

export function isConversationModeEnabled(): boolean {
  return conversationMode
}

export async function speakIfEnabled(text: string): Promise<void> {
  if (conversationMode) {
    await speak(text, { async: true })
  }
}
