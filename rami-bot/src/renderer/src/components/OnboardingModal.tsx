import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/store'
import { User, Bot, ArrowRight, Sparkles } from 'lucide-react'

function OnboardingModal() {
    const { t } = useTranslation()
    const { updateSettings, setHasOnboarded, settings } = useAppStore()
    const [step, setStep] = useState(1)
    const [userName, setUserName] = useState('')
    const [botName, setBotName] = useState('Rami')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            // Save settings using the store action which also syncs to main process via middleware or effect
            // But here we might need to manually call save if store doesn't auto-save
            updateSettings({ userName, botName })
            await window.electron?.saveSettings({ userName, botName })

            setHasOnboarded(true)
        } catch (error) {
            console.error('Failed to save onboarding settings:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-fadeIn">
            <div className="bg-dark-800 rounded-2xl w-[500px] border border-dark-600 shadow-2xl overflow-hidden animate-slideUp">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-8 text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                            <Sparkles size={32} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Welcome to Rami Bot</h2>
                        <p className="text-primary-100">Let's get to know each other</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    {step === 1 ? (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">
                                    What should I call you?
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={20} />
                                    <input
                                        type="text"
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        className="w-full bg-dark-700 border border-dark-600 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                                        placeholder="Enter your name"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && userName && setStep(2)}
                                    />
                                </div>
                            </div>
                            <button
                                disabled={!userName.trim()}
                                onClick={() => setStep(2)}
                                className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-dark-600 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                            >
                                Next <ArrowRight size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fadeIn">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">
                                    What would you like to call me?
                                </label>
                                <div className="relative">
                                    <Bot className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={20} />
                                    <input
                                        type="text"
                                        value={botName}
                                        onChange={(e) => setBotName(e.target.value)}
                                        className="w-full bg-dark-700 border border-dark-600 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                                        placeholder="Rami"
                                        onKeyDown={(e) => e.key === 'Enter' && botName && handleSubmit()}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(1)}
                                    className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-dark-300 font-medium rounded-xl transition-all"
                                >
                                    Back
                                </button>
                                <button
                                    disabled={!botName.trim() || isSubmitting}
                                    onClick={handleSubmit}
                                    className="flex-1 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 disabled:from-dark-600 disabled:to-dark-600 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-500/20"
                                >
                                    {isSubmitting ? 'Setting up...' : 'Get Started'}
                                    {!isSubmitting && <Sparkles size={18} />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Progress Dots */}
                <div className="p-6 pt-0 flex justify-center gap-2">
                    <div className={`w-2 h-2 rounded-full transition-colors ${step === 1 ? 'bg-primary-500' : 'bg-dark-600'}`} />
                    <div className={`w-2 h-2 rounded-full transition-colors ${step === 2 ? 'bg-primary-500' : 'bg-dark-600'}`} />
                </div>
            </div>
        </div>
    )
}

export default OnboardingModal
