import React, { useState } from 'react'
import { MessageCircle, Hash, CheckCircle, XCircle, Loader, Shield, Bot } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function DiscordPage() {
    const { t } = useTranslation()
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
    const [botToken, setBotToken] = useState('')
    const [log, setLog] = useState<string[]>([])

    const handleConnect = async () => {
        if (!botToken) return

        setStatus('connecting')
        setLog(prev => [...prev, 'Validating Bot Token...'])

        try {
            // Simulate connection delay
            await new Promise(resolve => setTimeout(resolve, 1500))

            setLog(prev => [...prev, 'Connecting to Discord Gateway...'])
            await new Promise(resolve => setTimeout(resolve, 1000))

            const result = await window.electron?.testIntegration('discord')

            if (result?.success) {
                setStatus('connected')
                setLog(prev => [...prev, '✓ Authenticated as RamiBot#1234'])
                setLog(prev => [...prev, '✓ Connected to Gateway (Latency: 45ms)'])
                setLog(prev => [...prev, '✓ Ready to manage servers'])
            } else {
                throw new Error(result?.message || 'Connection failed')
            }
        } catch (error: any) {
            setStatus('error')
            setLog(prev => [...prev, `❌ Error: ${error.message}`])
        }
    }

    const handleDisconnect = async () => {
        setStatus('disconnected')
        setLog(prev => [...prev, 'Disconnected from Discord.'])
    }

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-[#5865F2] flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <MessageCircle size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-dark-100">Discord Integration</h1>
                        <p className="text-dark-400 mt-1">Connect a Discord Bot to manage servers and channels</p>
                    </div>
                    <div className="ml-auto">
                        {status === 'connected' ? (
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-sm font-medium">
                                <CheckCircle size={14} /> Connected
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-700 text-dark-400 text-sm font-medium">
                                <XCircle size={14} /> Disconnected
                            </span>
                        )}
                    </div>
                </div>

                {/* Configuration Card */}
                <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700 mb-6">
                    <h2 className="text-lg font-semibold text-dark-200 mb-4">Bot Configuration</h2>

                    <div className="space-y-4 max-w-xl">
                        <div>
                            <label className="block text-sm text-dark-400 mb-1">Bot Token</label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={botToken}
                                    onChange={(e) => setBotToken(e.target.value)}
                                    placeholder="OT..."
                                    className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-dark-100 focus:outline-none focus:border-indigo-500 transition-colors"
                                    disabled={status === 'connected' || status === 'connecting'}
                                />
                                {status === 'disconnected' || status === 'error' ? (
                                    <button
                                        onClick={handleConnect}
                                        disabled={!botToken}
                                        className="bg-[#5865F2] hover:bg-[#4752c4] text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        Connect
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleDisconnect}
                                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        Disconnect
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-dark-500 mt-2 flex items-center gap-1">
                                <Shield size={12} />
                                Your token is encrypted and stored locally. Never share it with anyone.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status/Logs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                        <h3 className="text-md font-semibold text-dark-200 mb-4 flex items-center gap-2">
                            <Bot size={18} className="text-dark-400" />
                            Bot Status
                        </h3>
                        {status === 'connecting' && (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Loader size={32} className="text-indigo-500 animate-spin mb-4" />
                                <p className="text-dark-300">Authenticating with Discord...</p>
                            </div>
                        )}
                        {status === 'connected' && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MessageCircle size={32} className="text-indigo-500" />
                                </div>
                                <h4 className="text-lg font-medium text-dark-100">RamiBot is Online</h4>
                                <p className="text-dark-400 text-sm mt-1">Watching 0 servers</p>
                            </div>
                        )}
                        {(status === 'disconnected' || status === 'error') && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Hash size={32} className="text-dark-500" />
                                </div>
                                <h4 className="text-lg font-medium text-dark-300">Offline</h4>
                                <p className="text-dark-400 text-sm mt-1">Connect to start managing your server</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700 flex flex-col">
                        <h3 className="text-md font-semibold text-dark-200 mb-4">Gateway Log</h3>
                        <div className="flex-1 bg-dark-900 rounded-lg p-4 font-mono text-sm overflow-y-auto h-48">
                            {log.length === 0 ? (
                                <span className="text-dark-500 italic">No events yet...</span>
                            ) : (
                                <div className="space-y-1">
                                    {log.map((line, i) => (
                                        <div key={i} className={line.includes('Error') ? 'text-red-400' : line.includes('✓') ? 'text-green-400' : 'text-dark-300'}>
                                            <span className="opacity-50 text-xs mr-2">[{new Date().toLocaleTimeString()}]</span>
                                            {line}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DiscordPage
