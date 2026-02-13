import React from 'react'
import { useTranslation } from 'react-i18next'
import { Hash, Settings, ExternalLink } from 'lucide-react'
import { useAppStore } from '../../stores/store'

function SlackPage() {
    const { t } = useTranslation()
    const { settings, slackStatus } = useAppStore()

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-[#4A154B] flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Hash size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-dark-100">Slack Integration</h1>
                        <p className="text-dark-400 mt-1">Professional workspace communication</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Settings size={20} className="text-primary-400" />
                            Connection Status
                        </h2>

                        <div className="flex items-center mb-6">
                            <div className={`w-4 h-4 rounded-full mr-3 ${slackStatus === 'connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' :
                                settings?.slackBotToken ? 'bg-yellow-500' : 'bg-red-500'
                                }`} />
                            <span className="text-lg font-medium">
                                {slackStatus === 'connected' ? 'Connected & Active' :
                                    settings?.slackBotToken ? 'Configured (Ready)' : 'Disconnected'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-dark-900 rounded-xl p-4">
                                <label className="text-xs uppercase text-dark-500 font-semibold tracking-wider">Bot Token (xoxb-...)</label>
                                <div className="mt-1 font-mono text-sm text-dark-300 break-all">
                                    {settings?.slackBotToken ? `${settings.slackBotToken.substring(0, 15)}...` : 'Not configured'}
                                </div>
                            </div>
                        </div>

                        {settings?.slackBotToken && slackStatus !== 'connected' && (
                            <button
                                onClick={() => window.electron.invoke('slack:connect', { token: settings.slackBotToken, appToken: settings.slackAppToken })}
                                className="w-full mt-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary-500/20"
                            >
                                Reconnect Slack
                            </button>
                        )}
                    </div>

                    <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                        <h2 className="text-xl font-semibold mb-4">Slack App Configuration</h2>
                        <ul className="list-decimal list-inside space-y-3 text-dark-300">
                            <li>Create a Slack App at <strong className="text-primary-400">api.slack.com</strong></li>
                            <li>Enable <strong className="text-primary-400">Socket Mode</strong></li>
                            <li>Add <code className="bg-dark-900 px-1 text-primary-300">app_mentions:read</code> and <code className="bg-dark-900 px-1 text-primary-300">chat:write</code> scopes</li>
                            <li>Generate an <strong>App-level Token</strong> (xapp-...)</li>
                            <li>Copy and paste tokens into settings</li>
                        </ul>
                        <div className="mt-6 pt-6 border-t border-dark-700">
                            <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer"
                                className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                                Slack API Dashboard <ExternalLink size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SlackPage
