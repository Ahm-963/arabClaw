import { useState, useEffect } from 'react'
import { Zap, Activity, AlertTriangle, BookOpen, Play, Square, RefreshCw } from 'lucide-react'

interface ChaosStatus {
    globalEnabled: boolean
    activeExperiments: string[]
}

interface QAMetrics {
    averageQAScore: number
    totalScores: number
    recentFailures: number
    failureDetails: Array<{
        id: string
        score: number
        timestamp: number
    }>
}

interface PatternInfo {
    id: string
    category: 'build' | 'test' | 'policy' | 'runtime'
    description: string
    occurrences: number
    lastSeen: string
}

interface PlaybookSummary {
    id: string
    title: string
    when: string
    stepsCount: number
    pitfallsCount: number
    updatedAt: string
}

export function QualityPanel() {
    const [chaosStatus, setChaosStatus] = useState<ChaosStatus | null>(null)
    const [metrics, setMetrics] = useState<QAMetrics | null>(null)
    const [patterns, setPatterns] = useState<PatternInfo[]>([])
    const [playbooks, setPlaybooks] = useState<PlaybookSummary[]>([])
    const [selectedPlaybook, setSelectedPlaybook] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        loadAllData()
    }, [])

    const loadAllData = async () => {
        setLoading(true)
        await Promise.all([
            loadChaosStatus(),
            loadMetrics(),
            loadPatterns(),
            loadPlaybooks()
        ])
        setLoading(false)
    }

    const loadChaosStatus = async () => {
        try {
            console.log('[Quality] Loading chaos status...')
            const status = await (window as any).electron.invoke('quality:getChaosStatus')
            console.log('[Quality] Chaos status loaded:', status)
            setChaosStatus(status)
        } catch (err) {
            console.error('Failed to load chaos status:', err)
        }
    }

    const loadMetrics = async () => {
        try {
            console.log('[Quality] Loading metrics...')
            const data = await (window as any).electron.invoke('quality:getMetrics')
            console.log('[Quality] Metrics loaded:', data)
            setMetrics(data)
        } catch (err) {
            console.error('Failed to load metrics:', err)
        }
    }

    const loadPatterns = async () => {
        try {
            console.log('[Quality] Analyzing patterns...')
            const data = await (window as any).electron.invoke('quality:getPatterns')
            console.log('[Quality] Patterns loaded:', data)
            setPatterns(data)
        } catch (err) {
            console.error('Failed to load patterns:', err)
        }
    }

    const loadPlaybooks = async () => {
        try {
            console.log('[Quality] Loading playbooks...')
            const data = await (window as any).electron.invoke('quality:getPlaybooks')
            console.log('[Quality] Playbooks loaded:', data)
            setPlaybooks(data)
        } catch (err) {
            console.error('Failed to load playbooks:', err)
        }
    }

    const toggleChaosMode = async (enabled: boolean) => {
        try {
            console.log('[Quality] Toggling chaos mode:', enabled)
            await (window as any).electron.invoke('quality:setChaosMode', {
                enabled,
                experiments: enabled ? chaosStatus?.activeExperiments : []
            })
            console.log('[Quality] Chaos mode toggled successfully')
            await loadChaosStatus()
        } catch (err) {
            console.error('Failed to toggle chaos mode:', err)
        }
    }

    const toggleExperiment = async (experiment: string) => {
        if (!chaosStatus) return

        const isActive = chaosStatus.activeExperiments.includes(experiment)
        const newExperiments = isActive
            ? chaosStatus.activeExperiments.filter(e => e !== experiment)
            : [...chaosStatus.activeExperiments, experiment]

        try {
            console.log('[Quality] Toggling experiment:', experiment, 'isActive:', isActive)
            await (window as any).electron.invoke('quality:setChaosMode', {
                enabled: chaosStatus.globalEnabled,
                experiments: newExperiments
            })
            console.log('[Quality] Experiment toggled successfully')
            await loadChaosStatus()
        } catch (err) {
            console.error('Failed to toggle experiment:', err)
        }
    }

    const viewPlaybookDetails = async (id: string) => {
        try {
            console.log('[Quality] Loading playbook details for:', id)
            const details = await (window as any).electron.invoke('quality:getPlaybookDetails', id)
            console.log('[Quality] Playbook details loaded:', details)
            setSelectedPlaybook(details)
        } catch (err) {
            console.error('Failed to load playbook details:', err)
        }
    }

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'build': return 'bg-red-500/20 text-red-400 border-red-500/30'
            case 'test': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
            case 'policy': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
            case 'runtime': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        }
    }

    if (loading && !chaosStatus) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-900 text-white">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-400" />
                    <p>Loading Quality Dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-slate-900 text-white overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Zap className="w-6 h-6 text-yellow-400" />
                            Quality Assurance Dashboard
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Monitor system health and enable chaos experiments
                        </p>
                    </div>
                    <button
                        onClick={loadAllData}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Chaos Manager Section */}
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        Chaos Manager
                    </h2>

                    <div className="space-y-4">
                        {/* Global Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
                            <div>
                                <p className="font-medium">Global Chaos Mode</p>
                                <p className="text-sm text-slate-400">Master switch for all experiments</p>
                            </div>
                            <button
                                onClick={() => toggleChaosMode(!chaosStatus?.globalEnabled)}
                                className={`px-6 py-2 rounded-lg font-medium transition ${chaosStatus?.globalEnabled
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-green-600 hover:bg-green-700'
                                    }`}
                            >
                                {chaosStatus?.globalEnabled ? 'Disable' : 'Enable'}
                            </button>
                        </div>

                        {/* Experiments */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {['latency', 'tool_failure', 'exhaustion'].map(exp => {
                                const isActive = chaosStatus?.activeExperiments.includes(exp)
                                return (
                                    <div
                                        key={exp}
                                        className={`p-4 rounded-lg border-2 transition ${isActive
                                            ? 'bg-red-500/10 border-red-500'
                                            : 'bg-slate-900 border-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-medium capitalize">{exp.replace('_', ' ')}</p>
                                            <button
                                                onClick={() => toggleExperiment(exp)}
                                                disabled={!chaosStatus?.globalEnabled}
                                                className={`p-2 rounded transition ${isActive
                                                    ? 'bg-red-600 hover:bg-red-700'
                                                    : 'bg-slate-700 hover:bg-slate-600'
                                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {isActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-400">
                                            {exp === 'latency' && 'Inject network delays'}
                                            {exp === 'tool_failure' && 'Random tool failures'}
                                            {exp === 'exhaustion' && 'Resource exhaustion'}
                                        </p>
                                        {isActive && (
                                            <div className="mt-2">
                                                <span className="inline-block px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                                                    ACTIVE
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* QA Metrics Section */}
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-400" />
                        QA Metrics
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-slate-900 p-4 rounded-lg">
                            <p className="text-sm text-slate-400 mb-1">Average QA Score</p>
                            <p className="text-3xl font-bold text-green-400">{metrics?.averageQAScore || 0}%</p>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-lg">
                            <p className="text-sm text-slate-400 mb-1">Total Evaluations</p>
                            <p className="text-3xl font-bold text-blue-400">{metrics?.totalScores || 0}</p>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-lg">
                            <p className="text-sm text-slate-400 mb-1">Recent Failures</p>
                            <p className="text-3xl font-bold text-red-400">{metrics?.recentFailures || 0}</p>
                        </div>
                    </div>

                    {metrics && metrics.failureDetails.length > 0 && (
                        <div>
                            <p className="text-sm text-slate-400 mb-2">Recent Failure Details:</p>
                            <div className="space-y-2">
                                {metrics.failureDetails.map((failure, idx) => (
                                    <div key={idx} className="p-3 bg-slate-900 rounded flex items-center justify-between">
                                        <span className="text-sm font-mono text-slate-300">{failure.id}</span>
                                        <span className="text-sm text-red-400">Score: {failure.score}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Pattern Detection Section */}
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-400" />
                            Pattern Detection
                        </h2>
                        <button
                            onClick={loadPatterns}
                            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Analyze
                        </button>
                    </div>

                    {patterns.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No patterns detected yet</p>
                    ) : (
                        <div className="space-y-3">
                            {patterns.map(pattern => (
                                <div key={pattern.id} className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded text-xs border ${getCategoryColor(pattern.category)}`}>
                                                {pattern.category}
                                            </span>
                                            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                                                {pattern.occurrences} occurrences
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm mb-1">{pattern.description}</p>
                                    <p className="text-xs text-slate-400">Last seen: {pattern.lastSeen}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Playbook Browser Section */}
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-400" />
                        Playbook Library
                    </h2>

                    {playbooks.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No playbooks available yet</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {playbooks.map(playbook => (
                                <div
                                    key={playbook.id}
                                    className="p-4 bg-slate-900 rounded-lg border border-slate-700 hover:border-purple-500 transition cursor-pointer"
                                    onClick={() => viewPlaybookDetails(playbook.id)}
                                >
                                    <h3 className="font-semibold mb-2">{playbook.title}</h3>
                                    <p className="text-sm text-slate-400 mb-3">{playbook.when}</p>
                                    <div className="flex gap-4 text-xs text-slate-400">
                                        <span>{playbook.stepsCount} steps</span>
                                        <span>{playbook.pitfallsCount} pitfalls</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Updated: {playbook.updatedAt}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Playbook Details Modal */}
            {selectedPlaybook && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedPlaybook(null)}>
                    <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <h2 className="text-2xl font-bold">{selectedPlaybook.title}</h2>
                                <button
                                    onClick={() => setSelectedPlaybook(null)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-slate-400 mb-2">When to use:</p>
                                    <p>{selectedPlaybook.when}</p>
                                </div>

                                {selectedPlaybook.steps && selectedPlaybook.steps.length > 0 && (
                                    <div>
                                        <p className="text-sm text-slate-400 mb-2">Steps:</p>
                                        <ol className="list-decimal list-inside space-y-1">
                                            {selectedPlaybook.steps.map((step: string, idx: number) => (
                                                <li key={idx} className="text-sm">{step}</li>
                                            ))}
                                        </ol>
                                    </div>
                                )}

                                {selectedPlaybook.pitfalls && selectedPlaybook.pitfalls.length > 0 && (
                                    <div>
                                        <p className="text-sm text-slate-400 mb-2">Common Pitfalls:</p>
                                        <ul className="space-y-1">
                                            {selectedPlaybook.pitfalls.map((pitfall: string, idx: number) => (
                                                <li key={idx} className="text-sm text-orange-400">{pitfall}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {selectedPlaybook.examples && selectedPlaybook.examples.length > 0 && (
                                    <div>
                                        <p className="text-sm text-slate-400 mb-2">Examples:</p>
                                        <ul className="space-y-1">
                                            {selectedPlaybook.examples.map((example: string, idx: number) => (
                                                <li key={idx} className="text-sm text-green-400">{example}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

