import { useState } from 'react'
import { X, ArrowLeft, ArrowRight, Check, User, Code, Globe, FileText, Mic, Eye, Monitor } from 'lucide-react'

interface AgentCreatorModalProps {
    isOpen: boolean
    onClose: () => void
    onAgentCreated?: (agent: any) => void
}

interface AgentConfig {
    name: string
    role: string
    department: string
    avatar: string
    capabilities: string[]
    systemPrompt: string
    temperature: number
    maxTokens: number
}

const EMOJI_OPTIONS = [
    '🤖', '🎯', '⚡', '🌐', '💻', '📊', '🔍', '✍️', '🎨', '📚',
    '🧠', '🔬', '⚙️', '🛡️', '🎭', '🎪', '🎸', '🎬', '📱', '⭐'
]

const ROLE_PRESETS = [
    'Coder', 'Researcher', 'Writer', 'Reviewer', 'Debugger',
    'Social Media Manager', 'Data Analyst', 'Tester', 'Designer', 'Custom'
]

const DEPARTMENTS = [
    'Engineering', 'Product', 'Research', 'Operations', 'Support', 'Marketing', 'Custom'
]

const CAPABILITIES = [
    { id: 'code_execution', label: 'Code Execution', icon: Code, desc: 'Run bash, python, node scripts' },
    { id: 'web_browsing', label: 'Web Browsing & Research', icon: Globe, desc: 'Access internet and APIs' },
    { id: 'file_system', label: 'File System Access', icon: FileText, desc: 'Read/write files' },
    { id: 'api_integrations', label: 'API Integrations', icon: Globe, desc: 'Email, social media, etc.' },
    { id: 'voice_speech', label: 'Voice & Speech', icon: Mic, desc: 'Text-to-speech, listening' },
    { id: 'document_analysis', label: 'Document Analysis', icon: Eye, desc: 'Analyze PDFs, images' },
    { id: 'computer_control', label: 'Computer Control', icon: Monitor, desc: 'Screenshots, keyboard/mouse' }
]

export function AgentCreatorModal({ isOpen, onClose, onAgentCreated }: AgentCreatorModalProps) {
    const [step, setStep] = useState(1)
    const [config, setConfig] = useState<AgentConfig>({
        name: '',
        role: 'Custom',
        department: 'Operations',
        avatar: '🤖',
        capabilities: [],
        systemPrompt: '',
        temperature: 0.7,
        maxTokens: 4000
    })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [creating, setCreating] = useState(false)
    const [customRole, setCustomRole] = useState('')
    const [customDept, setCustomDept] = useState('')

    if (!isOpen) return null

    const validateStep1 = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!config.name.trim()) {
            newErrors.name = 'Name is required'
        }

        if (config.role === 'Custom' && !customRole.trim()) {
            newErrors.role = 'Please specify a custom role'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleNext = () => {
        if (step === 1 && !validateStep1()) {
            return
        }
        setStep(step + 1)
    }

    const handleBack = () => {
        setStep(step - 1)
    }

    const handleCreate = async () => {
        setCreating(true)
        try {
            const finalConfig = {
                name: config.name,
                role: config.role === 'Custom' ? customRole : config.role,
                department: config.department === 'Custom' ? customDept : config.department,
                avatar: config.avatar,
                capabilities: config.capabilities,
                systemPrompt: config.systemPrompt || `You are ${config.name}, a specialized agent created for specific tasks. Be professional, efficient, and helpful.`,
                temperature: config.temperature,
                maxTokens: config.maxTokens
            }

            console.log('[AgentCreator] Creating agent with config:', finalConfig)
            const result = await (window as any).electron.createAgent(finalConfig)

            if (result.success) {
                console.log('[AgentCreator] Agent created successfully:', result.agent)
                onAgentCreated?.(result.agent)
                onClose()
                // Reset form
                setConfig({
                    name: '',
                    role: 'Custom',
                    department: 'Operations',
                    avatar: '🤖',
                    capabilities: [],
                    systemPrompt: '',
                    temperature: 0.7,
                    maxTokens: 4000
                })
                setStep(1)
            } else {
                alert(`Failed to create agent: ${result.error}`)
            }
        } catch (error) {
            console.error('[AgentCreator] Failed to create agent:', error)
            alert('Failed to create agent. Please try again.')
        } finally {
            setCreating(false)
        }
    }

    const toggleCapability = (capId: string) => {
        setConfig(prev => ({
            ...prev,
            capabilities: prev.capabilities.includes(capId)
                ? prev.capabilities.filter(c => c !== capId)
                : [...prev.capabilities, capId]
        }))
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div
                className="bg-slate-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <User className="w-6 h-6 text-blue-400" />
                            Create New Agent
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">Step {step} of 3</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 pt-4">
                    <div className="flex items-center justify-between mb-6">
                        {[1, 2, 3].map(s => (
                            <div key={s} className="flex items-center flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${s < step ? 'bg-green-600 text-white' :
                                        s === step ? 'bg-blue-600 text-white' :
                                            'bg-slate-700 text-slate-400'
                                    }`}>
                                    {s < step ? <Check size={20} /> : s}
                                </div>
                                {s < 3 && (
                                    <div className={`flex-1 h-1 mx-2 ${s < step ? 'bg-green-600' : 'bg-slate-700'}`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step Content */}
                <div className="p-6">
                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Agent Name *
                                </label>
                                <input
                                    type="text"
                                    value={config.name}
                                    onChange={e => setConfig({ ...config, name: e.target.value })}
                                    placeholder="e.g., Translator, Data Analyst"
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                                />
                                {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Role
                                </label>
                                <select
                                    value={config.role}
                                    onChange={e => setConfig({ ...config, role: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                                >
                                    {ROLE_PRESETS.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                                {config.role === 'Custom' && (
                                    <input
                                        type="text"
                                        value={customRole}
                                        onChange={e => setCustomRole(e.target.value)}
                                        placeholder="Enter custom role..."
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none mt-2"
                                    />
                                )}
                                {errors.role && <p className="text-red-400 text-sm mt-1">{errors.role}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Department
                                </label>
                                <select
                                    value={config.department}
                                    onChange={e => setConfig({ ...config, department: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                                >
                                    {DEPARTMENTS.map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                                {config.department === 'Custom' && (
                                    <input
                                        type="text"
                                        value={customDept}
                                        onChange={e => setCustomDept(e.target.value)}
                                        placeholder="Enter custom department..."
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none mt-2"
                                    />
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Avatar
                                </label>
                                <div className="grid grid-cols-10 gap-2">
                                    {EMOJI_OPTIONS.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => setConfig({ ...config, avatar: emoji })}
                                            className={`p-3 text-2xl rounded-lg transition ${config.avatar === emoji
                                                    ? 'bg-blue-600 ring-2 ring-blue-400'
                                                    : 'bg-slate-900 hover:bg-slate-700'
                                                }`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Capabilities & Prompt */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-3">
                                    Capabilities
                                </label>
                                <div className="space-y-2">
                                    {CAPABILITIES.map(cap => (
                                        <label
                                            key={cap.id}
                                            className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition ${config.capabilities.includes(cap.id)
                                                    ? 'bg-blue-600/20 border-2 border-blue-500'
                                                    : 'bg-slate-900 border-2 border-slate-700 hover:border-slate-600'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={config.capabilities.includes(cap.id)}
                                                onChange={() => toggleCapability(cap.id)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <cap.icon size={18} className="text-blue-400" />
                                                    <span className="font-medium text-white">{cap.label}</span>
                                                </div>
                                                <p className="text-sm text-slate-400 mt-1">{cap.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    System Prompt
                                </label>
                                <textarea
                                    value={config.systemPrompt}
                                    onChange={e => setConfig({ ...config, systemPrompt: e.target.value })}
                                    placeholder="Define the agent's role, expertise, personality, and guidelines..."
                                    rows={8}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none resize-none"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    {config.systemPrompt.length} characters
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Temperature: {config.temperature.toFixed(1)}
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={config.temperature}
                                        onChange={e => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Lower = more focused, Higher = more creative</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Max Tokens: {config.maxTokens}
                                    </label>
                                    <input
                                        type="range"
                                        min="1000"
                                        max="8000"
                                        step="500"
                                        value={config.maxTokens}
                                        onChange={e => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Response length limit</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review & Create */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="bg-slate-900 rounded-lg p-6 border-2 border-blue-500/30">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="text-5xl">{config.avatar}</div>
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-bold text-white">{config.name}</h3>
                                        <p className="text-slate-400">{config.role === 'Custom' ? customRole : config.role}</p>
                                        <p className="text-sm text-slate-500">{config.department === 'Custom' ? customDept : config.department} Department</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm font-medium text-slate-400 mb-2">Capabilities:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {config.capabilities.length > 0 ? (
                                                config.capabilities.map(capId => {
                                                    const cap = CAPABILITIES.find(c => c.id === capId)
                                                    return (
                                                        <span key={capId} className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm border border-blue-500/30">
                                                            {cap?.label}
                                                        </span>
                                                    )
                                                })
                                            ) : (
                                                <p className="text-slate-500 text-sm">No capabilities selected</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-slate-400 mb-2">System Prompt:</p>
                                        <div className="bg-slate-800 p-4 rounded border border-slate-700 text-sm text-slate-300 max-h-40 overflow-y-auto">
                                            {config.systemPrompt || <span className="text-slate-500">Using default prompt</span>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-slate-400">Temperature:</p>
                                            <p className="text-white font-medium">{config.temperature.toFixed(1)}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400">Max Tokens:</p>
                                            <p className="text-white font-medium">{config.maxTokens}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-700 flex items-center justify-between sticky bottom-0 bg-slate-800">
                    <div>
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition flex items-center gap-2"
                            >
                                <ArrowLeft size={18} />
                                Back
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                        >
                            Cancel
                        </button>

                        {step < 3 && (
                            <button
                                onClick={handleNext}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
                            >
                                Next
                                <ArrowRight size={18} />
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                onClick={handleCreate}
                                disabled={creating}
                                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {creating ? 'Creating...' : 'Create Agent'}
                                {!creating && <Check size={18} />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
