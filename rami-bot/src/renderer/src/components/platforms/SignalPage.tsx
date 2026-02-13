import React from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, Settings, ExternalLink } from 'lucide-react'
import { useAppStore } from '../../stores/store'

function SignalPage() {
    const { t } = useTranslation()
    const { settings, signalStatus } = useAppStore()

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-[#3A76F0] flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Lock size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-dark-100">Signal Integration</h1>
                        <p className="text-dark-400 mt-1">Privacy-focused messaging for your AI assistant</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Settings size={20} className="text-primary-400" />
                            Connection Status
                        </h2>

                        <div className="flex items-center mb-6">
                            <div className={`w-4 h-4 rounded-full mr-3 ${signalStatus === 'connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' :
                                settings?.signalEnabled ? 'bg-yellow-500' : 'bg-red-500'
                                }`} />
                            <span className="text-lg font-medium">
                                {signalStatus === 'connected' ? 'Connected & Active' :
                                    settings?.signalEnabled ? 'Configured (Ready)' : 'Disconnected'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-dark-900 rounded-xl p-4">
                                <label className="text-xs uppercase text-dark-500 font-semibold tracking-wider">signal-cli Path</label>
                                <div className="mt-1 font-mono text-sm text-dark-300 break-all">
                                    {settings?.signalCliPath || 'Default system path'}
                                </div>
                            </div>
                        </div>

                        {settings?.signalEnabled && signalStatus !== 'connected' && (
                            <button
                                onClick={() => window.electron.invoke('signal:connect', { cliPath: settings.signalCliPath })}
                                className="w-full mt-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary-500/20"
                            >
                                Initialize Connection
                            </button>
                        )}
                    </div>

                    <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                        <h2 className="text-xl font-semibold mb-4">Requirements</h2>
                        <ul className="list-disc list-inside space-y-3 text-dark-300">
                            <li>Install <strong className="text-primary-400">signal-cli</strong> on your system</li>
                            <li>Register your phone number via CLI first</li>
                            <li>Ensure the CLI is accessible in your system PATH</li>
                            <li>Privacy mode must be disabled for the bot to see messages</li>
                        </ul>
                        <div className="mt-6 pt-6 border-t border-dark-700">
                            <a href="https://github.com/AsamK/signal-cli" target="_blank" rel="noopener noreferrer"
                                className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                                Install signal-cli <ExternalLink size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SignalPage
