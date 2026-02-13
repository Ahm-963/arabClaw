import React from 'react'
import { useTranslation } from 'react-i18next'
import { Apple, Settings, ExternalLink } from 'lucide-react'
import { useAppStore } from '../../stores/store'

function IMessagePage() {
    const { t } = useTranslation()
    const { settings, imessageStatus } = useAppStore()

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-[#34C759] flex items-center justify-center shadow-lg shadow-green-500/20">
                        <Apple size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-dark-100">iMessage (BlueBubbles)</h1>
                        <p className="text-dark-400 mt-1">Native Apple messaging for your assistant</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Settings size={20} className="text-primary-400" />
                            Connection Status
                        </h2>

                        <div className="flex items-center mb-6">
                            <div className={`w-4 h-4 rounded-full mr-3 ${imessageStatus === 'connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' :
                                settings?.imessageEnabled ? 'bg-yellow-500' : 'bg-red-500'
                                }`} />
                            <span className="text-lg font-medium">
                                {imessageStatus === 'connected' ? 'Connected & Active' :
                                    settings?.imessageEnabled ? 'Configured (Ready)' : 'Disconnected'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-dark-900 rounded-xl p-4">
                                <label className="text-xs uppercase text-dark-500 font-semibold tracking-wider">BlueBubbles Server URL</label>
                                <div className="mt-1 font-mono text-sm text-dark-300 break-all">
                                    {settings?.bluebubblesServerUrl || 'Not set'}
                                </div>
                            </div>
                        </div>

                        {settings?.imessageEnabled && imessageStatus !== 'connected' && (
                            <button
                                onClick={() => window.electron.invoke('imessage:connect', { url: settings.bluebubblesServerUrl, password: settings.bluebubblesPassword })}
                                className="w-full mt-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary-500/20"
                            >
                                Connect to Server
                            </button>
                        )}
                    </div>

                    <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                        <h2 className="text-xl font-semibold mb-4">Setup Requirements</h2>
                        <ul className="list-decimal list-inside space-y-3 text-dark-300">
                            <li>Set up a <strong className="text-primary-400">BlueBubbles Server</strong> on a macOS machine</li>
                            <li>Enable the <strong className="text-primary-400">Private API</strong> features on the server</li>
                            <li>Secure your server with a password</li>
                            <li>Enter the public URL (ngrok/Cloudflare) or local IP and password here</li>
                        </ul>
                        <div className="mt-6 pt-6 border-t border-dark-700">
                            <a href="https://bluebubbles.app" target="_blank" rel="noopener noreferrer"
                                className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                                BlueBubbles Website <ExternalLink size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default IMessagePage
