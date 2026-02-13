import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Bot, User, Loader2, Paperclip, Mic, MicOff, Zap, FileText, Monitor, Layout, PanelRightClose, MessageSquare } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '../stores/store'
import SynergySidebar from './SynergySidebar'
import CanvasPanel from './CanvasPanel'

interface ChatWindowProps {
  currentAgentId?: string
}

function ChatWindow({ currentAgentId }: ChatWindowProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [showCanvas, setShowCanvas] = useState(false)
  const [activeSessions, setActiveSessions] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastSpokenIdRef = useRef<string | null>(null)

  const {
    messages,
    addMessage,
    currentPlatform,
    telegramStatus,
    agentActivity,
    settings,
    isGodMode,
    setIsGodMode
  } = useAppStore()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()

    // Auto-read (Conversation Mode)
    const lastMsg = messages[messages.length - 1]
    if (lastMsg && (lastMsg.sender === 'bot' || lastMsg.sender === 'agent')) {
      if (settings?.voiceAutoRead && lastMsg.id !== lastSpokenIdRef.current) {
        lastSpokenIdRef.current = lastMsg.id

        // Play audio
        window.electron?.speak(lastMsg.text, {
          voice: undefined
        }).then(result => {
          if (result?.success && result.data?.audioData) {
            const audio = new Audio(`data:${result.data.format};base64,${result.data.audioData}`)
            audio.play().catch(e => console.error('Audio play failed', e))
          }
        })
      }
    }
  }, [messages, settings?.voiceAutoRead])

  const handleUpload = async () => {
    try {
      const result = await window.electron?.showOpenDialog({
        filters: [{ name: 'Documents', extensions: ['pdf', 'txt', 'md', 'json', 'ts', 'js'] }]
      })

      if (result?.filePaths?.[0]) {
        setIsProcessing(true)
        const filePath = result.filePaths[0]
        try {
          // Notify user upload started
          addMessage({
            id: `msg_${Date.now()}`,
            chatId: 'local',
            text: `📄 Uploading and analyzing document: ${filePath.split(/[\\/]/).pop()}...`,
            sender: 'user',
            timestamp: Date.now(),
            platform: currentPlatform
          })

          const ingestResult = await window.electron?.ingestDocument(filePath)

          if (ingestResult?.success) {
            addMessage({
              id: `msg_${Date.now()}_reply`,
              chatId: 'local',
              text: `✅ Document ingested successfully! I have learned ${ingestResult.learnedCount} items from it. You can now ask me questions about its content.`,
              sender: 'bot',
              timestamp: Date.now(),
              platform: currentPlatform
            })
          } else {
            throw new Error(ingestResult?.error || 'Unknown error')
          }
        } catch (e: any) {
          addMessage({
            id: `msg_${Date.now()}_err`,
            chatId: 'local',
            text: `❌ Failed to ingest document: ${e.message}`,
            sender: 'bot',
            timestamp: Date.now(),
            platform: currentPlatform
          })
        } finally {
          setIsProcessing(false)
        }
      }
    } catch (e) {
      console.error('Upload error:', e)
    }
  }

  const handleDictation = async () => {
    if (isListening) return

    setIsListening(true)
    try {
      addMessage({
        id: `msg_${Date.now()}_sys`,
        chatId: 'local',
        text: '🎤 Listening...',
        sender: 'bot',
        timestamp: Date.now(),
        platform: currentPlatform
      })

      const text = await window.electron?.listen(5000)
      if (text) {
        setInput(prev => prev + (prev ? ' ' : '') + text)
      }
    } catch (e) {
      console.error('Dictation failed:', e)
    } finally {
      setIsListening(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return

    const { isGodMode } = useAppStore.getState()

    const userMessage = {
      id: `msg_${Date.now()}`,
      chatId: 'local',
      text: input,
      sender: 'user' as const,
      timestamp: Date.now(),
      platform: currentPlatform
    }

    addMessage(userMessage)
    setInput('')
    setIsProcessing(true)

    try {
      if (isGodMode) {
        // God Mode: Send as Swarm Objective
        const response = await window.electron.invoke('synergy:userObjective', input)

        let responseText = 'Swarm objective initiated. Check the Dashboard for progress.'
        if (response && typeof response === 'object') {
          if (response.plan) {
            const plan = response.plan
            responseText = `### 🚀 ${plan.projectName || 'Autonomous Mission'}\n\n${plan.plan || 'Plan generated successfully. Swarm is now operational.'}`
          } else if (response.reply) {
            responseText = response.reply
          } else if (response.message) {
            responseText = response.message
          }
        } else if (typeof response === 'string') {
          responseText = response
        }

        const botMessage = {
          id: `msg_${Date.now()}`,
          chatId: 'local',
          text: responseText,
          sender: 'agent' as const,
          agentName: 'Orchestrator',
          timestamp: Date.now(),
          platform: currentPlatform
        }
        addMessage(botMessage)

      } else {
        // Standard Chat
        const response = await window.electron.processMessage(
          input,
          'local',
          currentPlatform
        )

        const botMessage = {
          id: `msg_${Date.now()}`,
          chatId: 'local',
          text: response,
          sender: 'bot' as const,
          timestamp: Date.now(),
          platform: currentPlatform
        }
        addMessage(botMessage)
      }
    } catch (error: any) {
      const errorMessage = {
        id: `msg_${Date.now()}`,
        chatId: 'local',
        text: `Error: ${error.message}`,
        sender: 'bot' as const,
        timestamp: Date.now(),
        platform: currentPlatform
      }
      addMessage(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const result = await window.electron.invoke('sessions:list')
        if (result && result.sessions) {
          setActiveSessions(result.sessions)
        }
      } catch (e) { }
    }

    fetchSessions()
    const interval = setInterval(fetchSessions, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getActivityText = () => {
    switch (agentActivity.type) {
      case 'thinking':
        return t('chat.thinking')
      case 'tool_use':
        return t('chat.toolUse', { tool: agentActivity.toolName || 'unknown' })
      case 'responding':
        return t('chat.processing')
      default:
        return null
    }
  }

  const activityText = getActivityText()

  return (
    <div className="flex flex-1 overflow-hidden h-full relative">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-dark-700 bg-dark-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isGodMode
              ? 'bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/20'
              : 'bg-gradient-to-br from-primary-500 to-primary-700'
              }`}>
              {isGodMode ? <Zap size={18} className="text-white" /> : <Bot size={18} className="text-white" />}
            </div>
            <div>
              <h2 className="font-medium text-dark-100 flex items-center gap-2">
                {isGodMode ? 'God Mode (Synergy)' : t('app.name')}
                {activeSessions.length > 0 && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[10px] rounded border border-green-500/20">
                    <MessageSquare size={10} /> {activeSessions.length} SESSIONS
                  </span>
                )}
              </h2>
              <p className="text-xs text-dark-400">
                {telegramStatus === 'connected' ? t('status.connected') : t('status.disconnected')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Visual Canvas Toggle */}
            <button
              onClick={() => setShowCanvas(!showCanvas)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showCanvas
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-dark-700 text-dark-400 hover:text-dark-200 border border-transparent'
                }`}
            >
              <Monitor size={14} />
              VISUALS
            </button>

            {/* God Mode Toggle */}
            <div className="flex items-center gap-3 pl-4 border-l border-dark-700">
              <span className={`text-[10px] font-bold tracking-tighter ${isGodMode ? 'text-purple-400' : 'text-dark-400'}`}>
                {isGodMode ? 'SOVEREIGN MODE' : 'STANDARD CHAT'}
              </span>
              <button
                onClick={() => setIsGodMode(!isGodMode)}
                className={`w-10 h-5 rounded-full p-1 transition-colors duration-300 relative ${isGodMode ? 'bg-purple-600' : 'bg-dark-600'
                  }`}
              >
                <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-300 ${isGodMode ? 'translate-x-5' : 'translate-x-0'
                  }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto px-6">
              <div className="text-center mb-10 animate-fadeIn">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-purple-500/20">
                  <Bot size={40} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-3">
                  Welcome to Rami Bot
                </h1>
                <p className="text-gray-400 max-w-lg mx-auto">
                  Your advanced AI ecosystem. Choose how you want to interact based on your needs.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-slideUp">
                {/* Standard Chat Card */}
                <div className="bg-dark-800/50 hover:bg-dark-800 border border-white/5 hover:border-blue-500/30 rounded-2xl p-6 transition-all duration-300 group cursor-default">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="text-2xl">💬</span>
                  </div>
                  <h3 className="text-lg font-semibold text-blue-400 mb-2">Standard Chat</h3>
                  <p className="text-sm text-gray-400 mb-4 h-10">Direct interaction for quick answers, coding assistance, and single-task execution.</p>
                </div>

                {/* God Mode Card */}
                <div className="bg-dark-800/50 hover:bg-dark-800 border border-white/5 hover:border-purple-500/30 rounded-2xl p-6 transition-all duration-300 group cursor-default relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-20 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="text-2xl">👁️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-purple-400 mb-2">God Mode (Synergy)</h3>
                  <p className="text-sm text-gray-400 mb-4 h-10">Supervise an autonomous organization of agents collaborating on complex projects.</p>
                </div>
              </div>

              <p className="text-xs text-dark-500 mt-12 animate-fadeIn delay-300">
                Type below to start a Standard Chat, or toggle God Mode for advanced operations.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 animate-fadeIn ${message.sender === 'user' ? 'message-user flex-row-reverse' : 'message-bot'
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${message.sender === 'user'
                    ? 'bg-primary-600'
                    : message.sender === 'agent'
                      ? 'bg-gradient-to-br from-purple-500 to-purple-700'
                      : 'bg-gradient-to-br from-primary-500 to-primary-700'
                    }`}
                >
                  {message.sender === 'user' ? (
                    <User size={16} className="text-white" />
                  ) : (
                    <Bot size={16} className="text-white" />
                  )}
                </div>
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${message.sender === 'user'
                    ? 'bg-primary-600 text-white'
                    : message.sender === 'agent'
                      ? 'bg-purple-900/30 border border-purple-700/50 text-dark-100'
                      : 'bg-dark-800 text-dark-100'
                    }`}
                >
                  {message.sender === 'agent' && message.agentName && (
                    <div className="text-xs font-semibold text-purple-400 mb-1">
                      🤖 {message.agentName}
                    </div>
                  )}
                  <div className="message-content">
                    {message.image && (
                      <div className="mb-3 rounded-lg overflow-hidden border border-white/10 shadow-lg">
                        <img
                          src={message.image.startsWith('data:') ? message.image : `data:image/png;base64,${message.image}`}
                          alt="Visual Context"
                          className="max-w-full h-auto cursor-zoom-in hover:brightness-110 transition-all"
                          onClick={() => {
                            const imgData = message.image;
                            if (imgData) {
                              window.open(imgData.startsWith('data:') ? imgData : `data:image/png;base64,${imgData}`);
                            }
                          }}
                        />
                      </div>
                    )}
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {typeof message.text === 'string' ? message.text : String(message.text || '')}
                    </ReactMarkdown>
                  </div>
                  <p className="text-xs mt-2 opacity-60">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}

          {/* Activity indicator */}
          {activityText && (
            <div className="flex gap-3 animate-fadeIn">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <Loader2 size={16} className="text-white animate-spin" />
              </div>
              <div className="bg-dark-800 rounded-2xl px-4 py-3">
                <p className="text-dark-300 text-sm">{activityText}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-dark-700 bg-dark-900/50">
          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={isProcessing}
              className="w-12 h-12 bg-dark-800 hover:bg-dark-700 rounded-xl flex items-center justify-center transition-colors text-dark-400 hover:text-dark-200"
              title="Upload Document"
            >
              <Paperclip size={20} />
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isGodMode ? "Enter high-level objective for the swarm..." : t('chat.placeholder')}
              disabled={isProcessing}
              className={`flex-1 bg-dark-800 text-dark-100 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 placeholder-dark-500 disabled:opacity-50 ${isGodMode ? 'focus:ring-purple-500' : 'focus:ring-primary-500'
                }`}
              rows={1}
            />

            <button
              onClick={handleDictation}
              disabled={isProcessing || isListening}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-dark-800 hover:bg-dark-700 text-dark-400 hover:text-dark-200'
                }`}
              title="Dictation"
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors disabled:bg-dark-700 disabled:cursor-not-allowed ${isGodMode
                ? 'bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 shadow-lg shadow-purple-900/20'
                : 'bg-primary-600 hover:bg-primary-500'
                }`}
            >
              {isProcessing ? (
                <Loader2 size={20} className="text-white animate-spin" />
              ) : (
                <Send size={20} className="text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Synergy Sidebar - Only active in God Mode */}
      {isGodMode && <SynergySidebar />}

      {/* Visual Workspace Panel */}
      {showCanvas && (
        <div className="w-[400px] flex-shrink-0 animate-in slide-in-from-right duration-300">
          <CanvasPanel />
        </div>
      )}
    </div>
  )
}

export default ChatWindow
