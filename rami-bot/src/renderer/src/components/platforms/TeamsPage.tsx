import React from 'react'
import { useTranslation } from 'react-i18next'
import { Phone, Settings, ExternalLink } from 'lucide-react'
import { useAppStore } from '../../stores/store'

function TeamsPage() {
    const { t } = useTranslation()
    const { settings, teamsStatus } = useAppStore()

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-[#4B53BC] flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Phone size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-dark-100">Microsoft Teams</h1>
                        <p className="text-dark-400 mt-1">Enterprise-grade AI collaboration</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Settings size={20} className="text-primary-400" />
                            Connection Status
                        </h2>

                        <div className="flex items-center mb-6">
                            <div className={`w-4 h-4 rounded-full mr-3 ${teamsStatus === 'connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' :
                                settings?.teamsEnabled ? 'bg-yellow-500' : 'bg-red-500'
                                }`} />
                            <span className="text-lg font-medium">
                                {teamsStatus === 'connected' ? 'Connected & Active' :
                                    settings?.teamsEnabled ? 'Configured (Ready)' : 'Disconnected'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-dark-900 rounded-xl p-4">
                                <label className="text-xs uppercase text-dark-500 font-semibold tracking-wider">Tenant ID</label>
                                <div className="mt-1 font-mono text-sm text-dark-300">
                                    {settings?.teamsTenantId ? `${settings.teamsTenantId.substring(0, 10)}...` : 'Not set'}
                                </div>
                            </div>
                            <div className="bg-dark-900 rounded-xl p-4">
                                <label className="text-xs uppercase text-dark-500 font-semibold tracking-wider">App ID (Client ID)</label>
                                <div className="mt-1 font-mono text-sm text-dark-300">
                                    {settings?.teamsAppId ? `${settings.teamsAppId.substring(0, 10)}...` : 'Not set'}
                                </div>
                            </div>
                        </div>

                        {settings?.teamsEnabled && teamsStatus !== 'connected' && (
                            <button
                                onClick={() => window.electron.invoke('teams:connect', { tenantId: settings.teamsTenantId, appId: settings.teamsAppId, appSecret: settings.teamsAppSecret })}
                                className="w-full mt-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary-500/20"
                            >
                                Connect Now
                            </button>
                        )}
                    </div>

                    <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                        <h2 className="text-xl font-semibold mb-4">Setup Guide</h2>
                        <ul className="list-decimal list-inside space-y-4 text-dark-300">
                            <li>Register an application in <strong className="text-primary-400">Azure Portal</strong></li>
                            <li>Grant <code className="bg-dark-900 px-1 text-primary-300">Chat.Read.All</code> and <code className="bg-dark-900 px-1 text-primary-300">ChatMessage.Send</code> permissions</li>
                            <li>Generate a client secret and paste it in settings</li>
                            <li>Add the bot to your Teams environment</li>
                        </ul>
                        <div className="mt-6 pt-6 border-t border-dark-700">
                            <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer"
                                className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                                Azure Portal <ExternalLink size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TeamsPage
