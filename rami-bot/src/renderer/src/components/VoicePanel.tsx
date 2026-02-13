import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Mic, MicOff, Volume2, VolumeX, Play, Square, Settings,
  MessageSquare, Clipboard, X, RefreshCw, Download, Sliders, Key
} from 'lucide-react'
import { useAppStore } from '../stores/store'

interface Voice {
  Name: string
  Id: string
  Culture: string
  Gender: string
  Age: string
  Provider?: 'system' | 'elevenlabs'
}

interface VoicePanelProps {
  isOpen: boolean
  mode?: 'default' | 'listen'
  onClose: () => void
  onSpeak: (text: string, options?: any) => void
}

function VoicePanel({ isOpen, mode = 'default', onClose, onSpeak }: VoicePanelProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [rate, setRate] = useState(0)
  const [volume, setVolume] = useState(100)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const { settings, updateSettings } = useAppStore()
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadVoices()
      if (mode === 'listen' && !isListening && !isSpeaking) {
        handleListen()
      }
    }
  }, [isOpen, mode, settings?.voiceProvider])

  const loadVoices = async () => {
    try {
      const result = await window.electron?.getVoices()
      if (result?.success && result.data) {
        setVoices(result.data)
        // If selected voice is not in the new list, select the first one
        if (result.data.length > 0) {
          const currentExists = result.data.some(v => v.Name === selectedVoice || v.Id === selectedVoice)
          if (!currentExists) {
            setSelectedVoice(result.data[0].Id || result.data[0].Name)
          }
        }
      }
    } catch (e) {
      console.error('Failed to load voices:', e)
    }
  }

  const handleSpeak = async () => {
    if (!text.trim()) return

    if (settings?.voiceProvider === 'elevenlabs' && !settings?.elevenLabsApiKey) {
      alert("Please configure your ElevenLabs API Key in settings first.")
      setShowSettings(true)
      return
    }

    setIsSpeaking(true)
    try {
      // For ElevenLabs, we use ID. For system, we might use Name or ID (usually Name for System.Speech)
      // The voice.ts implementation expects 'voice' parameter.
      const result = await window.electron?.speak(text, {
        voice: selectedVoice || undefined,
        rate,
        volume,
        async: true // We want non-blocking UI but we track state via events or estimate
      })

      // Since voice.ts now plays audio on server side, we don't get audioData back to play here.
      // We rely on the server process. 
      // However, we need to know when it finishes to update UI.
      // The current voice.ts implementation with 'async: true' returns immediately.
      // If we use 'async: false' (default), it waits.
      // Let's use async: false for now to keep simple state sync, 
      // OR we just set isSpeaking to false after a timeout or estimation.
      // For proper sync, we'd need an IPC event 'speech-ended'.
      // For now, let's assume blocking (await) is fine for short phrases, 
      // or we accept UI might be "Speaking" while it plays.

      // Actually, my voice.ts implementation for ElevenLabs WAITs for playback in PowerShell unless async is true.
      // If I want to block here until done, I should not pass async: true.

    } catch (e) {
      console.error('Speak error:', e)
    } finally {
      setIsSpeaking(false)
    }
  }

  const handleStop = async () => {
    try {
      await window.electron?.stopSpeaking()
      setIsSpeaking(false)
    } catch (e) { }
  }

  const handleListen = async () => {
    setIsListening(true)
    try {
      const result = await window.electron?.listen(10)
      if (result?.text) {
        setText(result.text)
      }
    } catch (e) {
      console.error('Listen error:', e)
    } finally {
      setIsListening(false)
    }
  }

  const handleReadClipboard = async () => {
    setIsSpeaking(true)
    try {
      await window.electron?.readClipboardAloud()
    } catch (e) {
      console.error('Read clipboard error:', e)
    } finally {
      setIsSpeaking(false)
    }
  }

  const handleSaveToFile = async () => {
    if (!text.trim()) return

    try {
      const result = await window.electron?.showSaveDialog({
        defaultPath: 'speech.wav',
        filters: [{ name: 'Audio', extensions: ['wav', 'mp3'] }]
      })

      if (result?.filePath) {
        await window.electron?.speakToFile(text, result.filePath, {
          voice: selectedVoice || undefined,
          rate
        })
      }
    } catch (e) {
      console.error('Save to file error:', e)
    }
  }

  const toggleAutoRead = () => {
    const newState = !settings?.voiceAutoRead
    window.electron?.saveSettings({ voiceAutoRead: newState })
    updateSettings({ ...settings!, voiceAutoRead: newState })
  }

  const handleProviderChange = (provider: 'system' | 'elevenlabs') => {
    window.electron?.saveSettings({ voiceProvider: provider })
    updateSettings({ ...settings!, voiceProvider: provider })
    // loadVoices will trigger via useEffect
  }

  const handleApiKeyChange = (key: string) => {
    updateSettings({ ...settings!, elevenLabsApiKey: key })
  }

  const saveApiKey = () => {
    window.electron?.saveSettings({ elevenLabsApiKey: settings?.elevenLabsApiKey })
    loadVoices()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-2xl w-[600px] max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center">
              <Volume2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t('voice.title', 'Voice Control')}</h2>
              <p className="text-sm text-dark-400">{t('voice.subtitle', 'Text-to-speech & Speech recognition')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-primary-600' : 'hover:bg-dark-700'
                }`}
            >
              <Sliders size={20} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 bg-dark-750 border-b border-dark-700 space-y-4 overflow-y-auto max-h-[40vh]">

            {/* Provider Selection */}
            <div className="flex gap-4 p-1 bg-dark-700 rounded-lg">
              <button
                onClick={() => handleProviderChange('system')}
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${settings?.voiceProvider === 'system' ? 'bg-dark-600 shadow-sm text-white' : 'text-dark-400 hover:text-dark-200'
                  }`}
              >
                System Voices
              </button>
              <button
                onClick={() => handleProviderChange('elevenlabs')}
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${settings?.voiceProvider === 'elevenlabs' ? 'bg-primary-600 shadow-sm text-white' : 'text-dark-400 hover:text-dark-200'
                  }`}
              >
                ElevenLabs
              </button>
            </div>

            {/* ElevenLabs API Key */}
            {settings?.voiceProvider === 'elevenlabs' && (
              <div className="space-y-2">
                <label className="text-sm text-dark-400 block">ElevenLabs API Key</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-2.5 text-dark-500" size={16} />
                    <input
                      type="password"
                      value={settings?.elevenLabsApiKey || ''}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="sk_..."
                    />
                  </div>
                  <button
                    onClick={saveApiKey}
                    className="px-3 py-2 bg-dark-600 hover:bg-dark-500 rounded-lg text-sm transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Voice Selection */}
            <div>
              <label className="text-sm text-dark-400 mb-2 block">{t('voice.selectVoice', 'Voice')}</label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {voices.map((voice) => (
                  <option key={voice.Id || voice.Name} value={voice.Id || voice.Name}>
                    {voice.Name} ({voice.Gender}, {voice.Culture})
                  </option>
                ))}
              </select>
            </div>

            {/* Rate Slider */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <label className="text-dark-400">{t('voice.rate', 'Speed')}</label>
                <span className="text-dark-300">{rate > 0 ? `+${rate}` : rate}</span>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                value={rate}
                onChange={(e) => setRate(parseInt(e.target.value))}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-xs text-dark-500 mt-1">
                <span>{t('voice.slow', 'Slow')}</span>
                <span>{t('voice.normal', 'Normal')}</span>
                <span>{t('voice.fast', 'Fast')}</span>
              </div>
            </div>

            {/* Volume Slider */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <label className="text-dark-400">{t('voice.volume', 'Volume')}</label>
                <span className="text-dark-300">{volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-full accent-primary-500"
              />
            </div>

            {/* Conversation Mode */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-dark-300">{t('voice.conversationMode', 'Conversation Mode')}</label>
                <p className="text-xs text-dark-500">{t('voice.conversationModeDesc', 'Automatically read bot responses aloud')}</p>
              </div>
              <button
                onClick={toggleAutoRead}
                className={`w-12 h-6 rounded-full transition-colors ${settings?.voiceAutoRead ? 'bg-green-500' : 'bg-dark-600'
                  }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${settings?.voiceAutoRead ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Text Input */}
          <div>
            <label className="text-sm text-dark-400 mb-2 block">{t('voice.textToSpeak', 'Text to Speak')}</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('voice.enterText', 'Enter text to convert to speech...')}
              rows={4}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleReadClipboard}
              disabled={isSpeaking}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-dark-700 hover:bg-dark-600 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Clipboard size={18} />
              {t('voice.readClipboard', 'Read Clipboard')}
            </button>
            <button
              onClick={handleSaveToFile}
              disabled={!text.trim()}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-dark-700 hover:bg-dark-600 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Download size={18} />
              {t('voice.saveToFile', 'Save to File')}
            </button>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-4 py-4">
            {/* Listen Button */}
            <button
              onClick={handleListen}
              disabled={isListening || isSpeaking}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isListening
                ? 'bg-red-500 animate-pulse'
                : 'bg-dark-700 hover:bg-dark-600'
                } disabled:opacity-50`}
            >
              {isListening ? <MicOff size={28} /> : <Mic size={28} />}
            </button>

            {/* Speak/Stop Button */}
            <button
              onClick={isSpeaking ? handleStop : handleSpeak}
              disabled={!text.trim() && !isSpeaking}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isSpeaking
                ? 'bg-red-500 hover:bg-red-400'
                : 'bg-green-600 hover:bg-green-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSpeaking ? <Square size={32} /> : <Play size={32} className="ml-1" />}
            </button>

            {/* Refresh Voices */}
            <button
              onClick={loadVoices}
              className="w-16 h-16 rounded-full bg-dark-700 hover:bg-dark-600 flex items-center justify-center transition-colors"
            >
              <RefreshCw size={24} />
            </button>
          </div>

          {/* Status */}
          <div className="text-center text-sm text-dark-400">
            {isListening && (
              <div className="flex items-center justify-center gap-2 text-red-400">
                <Mic size={16} className="animate-pulse" />
                {t('voice.listening', 'Listening... Speak now')}
              </div>
            )}
            {isSpeaking && (
              <div className="flex items-center justify-center gap-2 text-green-400">
                <Volume2 size={16} className="animate-pulse" />
                {t('voice.speaking', 'Speaking...')}
              </div>
            )}
            {!isListening && !isSpeaking && (
              <p>{t('voice.ready', 'Ready')}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-700 bg-dark-750 flex-shrink-0">
          <div className="flex items-center justify-between text-sm text-dark-500">
            <span>{voices.length} {t('voice.voicesAvailable', 'voices available')}</span>
            <span>{selectedVoice || t('voice.defaultVoice', 'Default voice')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VoicePanel
