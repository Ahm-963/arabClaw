import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Monitor, Maximize2, Minimize2, Trash2, Download,
    Layers, Image as ImageIcon, FileText, Code,
    Search, RefreshCw, X, Layout, Plus, PanelRightClose,
    ChevronRight, ChevronLeft
} from 'lucide-react'
import { useAppStore } from '../stores/store'

interface CanvasMessage {
    id: string
    type: 'text' | 'image' | 'json' | 'action'
    content: string
    timestamp: number
}

function CanvasPanel() {
    const { t } = useTranslation()
    const { isGodMode } = useAppStore()
    const [messages, setMessages] = useState<CanvasMessage[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedType, setSelectedType] = useState<string>('all')
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchMessages()

        // Listen for new canvas messages
        const unsubscribe = window.electron.on('canvas:message' as any, () => {
            fetchMessages()
        })

        return () => {
            if (unsubscribe) unsubscribe()
        }
    }, [])

    const fetchMessages = async () => {
        setIsLoading(true)
        try {
            const result = await window.electron.invoke('canvas:get')
            if (result && result.messages) {
                // Ensure content exists for all messages to avoid crashes
                const sanitized = result.messages.map((m: any) => ({
                    ...m,
                    content: m.content || ''
                }))
                setMessages(sanitized)
            }
        } catch (error) {
            console.error('Failed to fetch canvas messages:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const clearCanvas = async () => {
        if (confirm('Are you sure you want to clear the visual workspace?')) {
            try {
                await window.electron.invoke('canvas:reset')
                setMessages([])
            } catch (error) {
                console.error('Failed to clear canvas:', error)
            }
        }
    }

    const downloadCanvas = async () => {
        try {
            // This would normally open a save dialog
            await window.electron.invoke('canvas:export', { filePath: 'canvas_export.txt' })
            alert('Canvas exported to user directory')
        } catch (error) {
            console.error('Failed to export canvas:', error)
        }
    }

    const filteredMessages = messages.filter(m => {
        const content = m.content || ''
        const matchesSearch = content.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = selectedType === 'all' || m.type === selectedType
        return matchesSearch && matchesType
    })

    const renderMessageContent = (message: CanvasMessage) => {
        switch (message.type) {
            case 'image':
                return (
                    <div className="relative group">
                        <img
                            src={message.content.startsWith('data:') ? message.content : `data:image/png;base64,${message.content}`}
                            alt="Visual Step"
                            className="rounded-lg w-full border border-dark-600 shadow-lg"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                            <button className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md text-white">
                                <Maximize2 size={18} />
                            </button>
                        </div>
                    </div>
                )
            case 'json':
                return (
                    <div className="bg-dark-900/50 p-3 rounded-lg border border-dark-700 font-mono text-xs overflow-x-auto">
                        <pre className="text-blue-400">{message.content}</pre>
                    </div>
                )
            case 'text':
                return (
                    <div className="text-sm text-dark-200 leading-relaxed whitespace-pre-wrap">
                        {message.content || ''}
                    </div>
                )
            default:
                return (
                    <div className="text-sm text-dark-400 italic">
                        Action: {message.content}
                    </div>
                )
        }
    }

    return (
        <div className="flex flex-col h-full bg-dark-850 border-l border-dark-700 animate-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <header className="p-4 border-b border-dark-700 flex items-center justify-between bg-dark-800/50 backdrop-blur-xl sticky top-0 z-10">
                <div className="flex items-center gap-2 text-primary-400">
                    <Monitor size={18} />
                    <h2 className="font-bold text-dark-100 uppercase tracking-wider text-xs">Visual Workspace</h2>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={fetchMessages}
                        disabled={isLoading}
                        className="p-1.5 hover:bg-dark-700 rounded-lg text-dark-400 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={downloadCanvas}
                        className="p-1.5 hover:bg-dark-700 rounded-lg text-dark-400 transition-colors"
                        title="Export"
                    >
                        <Download size={14} />
                    </button>
                    <button
                        onClick={clearCanvas}
                        className="p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-dark-400 transition-colors"
                        title="Clear Workspace"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="p-3 border-b border-dark-700 bg-dark-800/30">
                <div className="relative mb-3">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search workspace..."
                        className="w-full bg-dark-900/50 border border-dark-600 rounded-lg pl-9 pr-3 py-1.5 text-xs text-dark-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                </div>
                <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                    {['all', 'image', 'text', 'json'].map(type => (
                        <button
                            key={type}
                            onClick={() => setSelectedType(type)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight transition-all border ${selectedType === type
                                ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-600/20'
                                : 'bg-dark-700 border-dark-600 text-dark-400 hover:border-dark-500 hover:text-dark-200'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar"
            >
                {isLoading && messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-dark-500 animate-pulse">
                        <RefreshCw size={32} className="animate-spin mb-4 opacity-20" />
                        <p className="text-sm">Powering up visuals...</p>
                    </div>
                ) : filteredMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-dark-500 py-12 px-6 text-center">
                        <div className="w-16 h-16 rounded-3xl bg-dark-800 flex items-center justify-center mb-4 border border-dark-700">
                            <Monitor size={32} className="opacity-20" />
                        </div>
                        <h3 className="text-dark-200 font-semibold mb-1">Workspace Empty</h3>
                        <p className="text-xs max-w-[200px]">Agent actions, screenshots, and structured data will appear here.</p>
                    </div>
                ) : (
                    filteredMessages.map((msg, idx) => (
                        <div
                            key={msg.id}
                            className="group animate-in fade-in slide-in-from-bottom-2 duration-500"
                        >
                            {/* Timestamp & Type Badge */}
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-mono text-dark-500">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border ${msg.type === 'image' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                                    msg.type === 'json' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                        'bg-dark-700 border-dark-600 text-dark-400'
                                    }`}>
                                    {msg.type}
                                </span>
                                <div className="h-[1px] flex-1 bg-dark-700 opacity-50" />
                            </div>

                            {/* Content */}
                            <div className="pl-2 border-l-2 border-transparent group-hover:border-primary-500/20 transition-all">
                                {renderMessageContent(msg)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Stats */}
            <footer className="px-4 py-2 bg-dark-900/80 border-t border-dark-700 flex items-center justify-between text-[10px] text-dark-500">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <ImageIcon size={10} /> {messages.filter(m => m.type === 'image').length}
                    </span>
                    <span className="flex items-center gap-1">
                        <FileText size={10} /> {messages.filter(m => m.type === 'text').length}
                    </span>
                    <span className="flex items-center gap-1">
                        <Code size={10} /> {messages.filter(m => m.type === 'json').length}
                    </span>
                </div>
                <span>RAMI-VISION v2.0</span>
            </footer>
        </div>
    )
}

export default CanvasPanel
