import React from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle, Settings, ExternalLink } from 'lucide-react'
import { useAppStore } from '../../stores/store'

function TelegramPage() {
    const { t } = useTranslation()
    const { settings, telegramStatus } = useAppStore()

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-[#229ED9] flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <MessageCircle size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-dark-100">Telegram Integration</h1>
                        <p className="text-dark-400 mt-1">Connect Rami Bot to handle messages and commands via Telegram</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Status Card */}
                    <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Settings size={20} className="text-primary-400" />
                            Connection Status
                        </h2>

                        <div className="flex items-center mb-6">
                            <div className={`w-4 h-4 rounded-full mr-3 ${telegramStatus === 'connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' :
                                    settings?.telegramBotToken ? 'bg-yellow-500' : 'bg-red-500'
                                }`} />
                            <span className="text-lg font-medium">
                                {telegramStatus === 'connected' ? 'Connected & Active' :
                                    settings?.telegramBotToken ? 'Configured (Ready)' : 'Disconnected'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-dark-900 rounded-xl p-4">
                                <label className="text-xs uppercase text-dark-500 font-semibold tracking-wider">Bot Token</label>
                                <div className="mt-1 font-mono text-sm text-dark-300 break-all">
                                    {settings?.telegramBotToken ?
                                        settings.telegramBotToken.substring(0, 10) + '...' + settings.telegramBotToken.substring(settings.telegramBotToken.length - 5)
                                        : 'Not configured'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Instructions Card */}
                    <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                        <h2 className="text-xl font-semibold mb-4">How to Connect</h2>
                        <ol className="list-decimal list-inside space-y-3 text-dark-300">
                            <li>Open Telegram and search for <strong className="text-primary-400">@BotFather</strong></li>
                            <li>Send the command <code className="bg-dark-900 px-1.5 py-0.5 rounded text-primary-300">/newbot</code></li>
                            <li>Follow the instructions to name your bot</li>
                            <li>Copy the <strong>HTTP API Token</strong> provided</li>
                            <li>Paste the token in <strong>Settings</strong> and save</li>
                        </ol>
                        <div className="mt-6 pt-6 border-t border-dark-700">
                            <a href="https://core.telegram.org/bots/features" target="_blank" rel="noopener noreferrer"
                                className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                                Learn more about Telegram Bots <ExternalLink size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TelegramPage
