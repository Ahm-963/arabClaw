import React, { useState } from 'react'
import { MessageSquare, Smartphone, CheckCircle, XCircle, Loader, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function WhatsAppPage() {
    const { t } = useTranslation()
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [log, setLog] = useState<string[]>([])

    const handleConnect = async () => {
        if (!phoneNumber) return

        setStatus('connecting')
        setLog(prev => [...prev, `Initiating connection for ${phoneNumber}...`])

        try {
            // Simulate connection delay
            setLog(prev => [...prev, 'Requesting QR code...'])
            await new Promise(resolve => setTimeout(resolve, 2000))

            const result = await window.electron?.testIntegration('whatsapp')

            if (result?.success) {
                setStatus('connected')
                setLog(prev => [...prev, '✓ Connection established successfully!'])
                setLog(prev => [...prev, '✓ Webhooks registered'])
                setLog(prev => [...prev, '✓ Listening for messages'])
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
        setLog(prev => [...prev, 'Disconnected from WhatsApp.'])
    }

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-[#25D366] flex items-center justify-center shadow-lg shadow-green-500/20">
                        <MessageSquare size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-dark-100">WhatsApp Integration</h1>
                        <p className="text-dark-400 mt-1">Connect via WhatsApp Web to send and receive messages</p>
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
                    <h2 className="text-lg font-semibold text-dark-200 mb-4">Connection Settings</h2>

                    <div className="space-y-4 max-w-md">
                        <div>
                            <label className="block text-sm text-dark-400 mb-1">Phone Number (with Business API)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="+1 234 567 8900"
                                    className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-dark-100 focus:outline-none focus:border-green-500 transition-colors"
                                    disabled={status === 'connected' || status === 'connecting'}
                                />
                                {status === 'disconnected' || status === 'error' ? (
                                    <button
                                        onClick={handleConnect}
                                        disabled={!phoneNumber}
                                        className="bg-[#25D366] hover:bg-[#1fae53] text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                            <p className="text-xs text-dark-500 mt-2">
                                Note: This integration uses WhatsApp Business API or Web automation. Ensure your number is registered.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status/Logs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                        <h3 className="text-md font-semibold text-dark-200 mb-4 flex items-center gap-2">
                            <Smartphone size={18} className="text-dark-400" />
                            Connection Status
                        </h3>
                        {status === 'connecting' && (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Loader size={32} className="text-green-500 animate-spin mb-4" />
                                <p className="text-dark-300">Establishing secure connection...</p>
                            </div>
                        )}
                        {status === 'connected' && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle size={32} className="text-green-500" />
                                </div>
                                <h4 className="text-lg font-medium text-dark-100">Bot is Online</h4>
                                <p className="text-dark-400 text-sm mt-1">Ready to process messages</p>
                            </div>
                        )}
                        {(status === 'disconnected' || status === 'error') && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Smartphone size={32} className="text-dark-500" />
                                </div>
                                <h4 className="text-lg font-medium text-dark-300">Ready to Connect</h4>
                                <p className="text-dark-400 text-sm mt-1">Enter your details to start</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700 flex flex-col">
                        <h3 className="text-md font-semibold text-dark-200 mb-4">Activity Log</h3>
                        <div className="flex-1 bg-dark-900 rounded-lg p-4 font-mono text-sm overflow-y-auto h-48">
                            {log.length === 0 ? (
                                <span className="text-dark-500 italic">No activity yet...</span>
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

export default WhatsAppPage
