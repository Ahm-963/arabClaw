import React from 'react'
import { useTranslation } from 'react-i18next'
import { Home, Settings, ExternalLink } from 'lucide-react'
import { useAppStore } from '../../stores/store'

function MatrixPage() {
    const { t } = useTranslation()
    const { settings, matrixStatus } = useAppStore()

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-[#000000] border border-dark-600 flex items-center justify-center shadow-lg shadow-white/5">
                        <Home size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-dark-100">Matrix Integration</h1>
                        <p className="text-dark-400 mt-1">Decentralized communication for your AI</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Settings size={20} className="text-primary-400" />
                            Connection Status
                        </h2>

                        <div className="flex items-center mb-6">
                            <div className={`w-4 h-4 rounded-full mr-3 ${matrixStatus === 'connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' :
                                settings?.matrixEnabled ? 'bg-yellow-500' : 'bg-red-500'
                                }`} />
                            <span className="text-lg font-medium">
                                {matrixStatus === 'connected' ? 'Connected & Active' :
                                    settings?.matrixEnabled ? 'Configured (Ready)' : 'Disconnected'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-dark-900 rounded-xl p-4">
                                <label className="text-xs uppercase text-dark-500 font-semibold tracking-wider">Homeserver</label>
                                <div className="mt-1 font-mono text-sm text-dark-300 break-all">
                                    {settings?.matrixHomeserver || 'Not set'}
                                </div>
                            </div>
                            <div className="bg-dark-900 rounded-xl p-4">
                                <label className="text-xs uppercase text-dark-500 font-semibold tracking-wider">User ID</label>
                                <div className="mt-1 font-mono text-sm text-dark-300 break-all">
                                    {settings?.matrixUserId || 'Not set'}
                                </div>
                            </div>
                        </div>

                        {settings?.matrixEnabled && matrixStatus !== 'connected' && (
                            <button
                                onClick={() => window.electron.invoke('matrix:connect', { homeserver: settings.matrixHomeserver, userId: settings.matrixUserId, accessToken: settings.matrixAccessToken })}
                                className="w-full mt-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary-500/20"
                            >
                                Sync with Homeserver
                            </button>
                        )}
                    </div>

                    <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                        <h2 className="text-xl font-semibold mb-4">How to set up</h2>
                        <ul className="list-decimal list-inside space-y-3 text-dark-300">
                            <li>Choose a Matrix homeserver (e.g. <strong className="text-primary-400">matrix.org</strong>)</li>
                            <li>Create a dedicated bot account</li>
                            <li>Obtain an <strong>Access Token</strong> from your client settings (e.g. Element)</li>
                            <li>Invite the bot to rooms where you want it to operate</li>
                        </ul>
                        <div className="mt-6 pt-6 border-t border-dark-700">
                            <a href="https://matrix.org/docs/guides/client-server-api" target="_blank" rel="noopener noreferrer"
                                className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                                Matrix API Docs <ExternalLink size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MatrixPage
