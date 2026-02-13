
import React, { useState, useEffect, useRef } from 'react'
import { X, Play, Loader, Send, Zap, CheckCircle, AlertTriangle, ArrowRight, Layers, Bot } from 'lucide-react'

interface TaskNode {
    id: string
    title: string
    description: string
    role: string
    priority: string
    dependencies: string[]
}

interface Plan {
    plan: string
    tasks: TaskNode[]
}

interface GlobalPlanningModalProps {
    isOpen: boolean
    onClose: () => void
}

const GlobalPlanningModal: React.FC<GlobalPlanningModalProps> = ({ isOpen, onClose }) => {
    const [objective, setObjective] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [plan, setPlan] = useState<Plan | null>(null)
    const [isExecuting, setIsExecuting] = useState(false)
    const [executionId, setExecutionId] = useState<string | null>(null)

    if (!isOpen) return null

    const handleGenerate = async () => {
        if (!objective.trim()) return
        setIsGenerating(true)
        setPlan(null)
        try {
            const result = await window.electron.invoke('synergy:previewProject', objective)
            if (result) {
                setPlan(result)
            } else {
                alert('Failed to generate plan. Try being more specific.')
            }
        } catch (error) {
            console.error('Plan generation failed:', error)
            alert('Plan generation failed.')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleExecute = async () => {
        if (!plan) return
        setIsExecuting(true)
        try {
            const pid = await window.electron.invoke('synergy:createProjectFromPlan', plan)
            setExecutionId(pid)
            // Optional: Close modal after short delay or show success state
            setTimeout(() => {
                onClose()
                setObjective('')
                setPlan(null)
                setExecutionId(null)
                setIsExecuting(false)
            }, 2000)
        } catch (error) {
            console.error('Execution failed:', error)
            alert('Execution failed.')
            setIsExecuting(false)
        }
    }

    // --- Graph Visualization Logic ---
    const renderGraph = () => {
        if (!plan || !plan.tasks) return null

        // Simple layer calculation
        const levels: Map<string, number> = new Map()
        const getLevel = (id: string, visited = new Set<string>()): number => {
            if (visited.has(id)) return 0 // Cycle detected
            if (levels.has(id)) return levels.get(id)!

            const task = plan.tasks.find(t => t.id === id)
            if (!task || !task.dependencies || task.dependencies.length === 0) {
                levels.set(id, 0)
                return 0
            }

            visited.add(id)
            const maxDepLevel = Math.max(...task.dependencies.map(d => getLevel(d, visited)))
            visited.delete(id)

            levels.set(id, maxDepLevel + 1)
            return maxDepLevel + 1
        }

        plan.tasks.forEach(t => getLevel(t.id))

        const maxLevel = Math.max(...Array.from(levels.values()), 0)
        const columns: TaskNode[][] = Array.from({ length: maxLevel + 1 }, () => [])

        plan.tasks.forEach(t => {
            const level = levels.get(t.id) || 0
            columns[level].push(t)
        })

        return (
            <div className="flex gap-12 items-center justify-center min-h-[300px] p-4 overflow-auto">
                {columns.map((col, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-6 relative">
                        {/* Column Label */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] text-dark-500 font-black uppercase tracking-widest whitespace-nowrap">
                            Phase {colIdx + 1}
                        </div>

                        {col.map(task => (
                            <div key={task.id} className="w-64 p-4 bg-dark-800 border border-white/10 rounded-xl relative group hover:border-primary-500/50 transition-all">
                                {/* Connector Lines (Simplified - visual only, CSS based lines are hard here without absolute positioning context over whole area) */}
                                {colIdx > 0 && (
                                    <div className="absolute top-1/2 -left-6 w-6 h-px bg-white/10"></div>
                                )}
                                {colIdx < columns.length - 1 && (
                                    <div className="absolute top-1/2 -right-6 w-6 h-px bg-white/10"></div>
                                )}

                                <div className="flex justify-between items-start mb-2">
                                    <div className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${task.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                                        }`}>
                                        {task.priority}
                                    </div>
                                    <div className="text-[10px] text-dark-500 font-mono">
                                        {task.role}
                                    </div>
                                </div>
                                <h4 className="font-bold text-sm text-white mb-1 line-clamp-2">{task.title}</h4>
                                <p className="text-xs text-dark-400 line-clamp-3">{task.description}</p>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
            <div className={`w-full max-w-5xl bg-dark-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-500 ${plan ? 'h-[80vh]' : 'h-auto'}`}>

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-dark-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-500/10 rounded-xl text-primary-400">
                            <Layers size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Global Orchestrator</h2>
                            <p className="text-xs text-dark-400 font-medium">Define strategic objectives for the neural swarm</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-dark-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col p-6 overflow-hidden">
                    {!plan && !isGenerating && !executionId && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95">
                            <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mb-6 border border-dark-700 shadow-inner">
                                <Zap size={32} className="text-dark-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">What is your command?</h3>
                            <p className="text-dark-400 max-w-md mb-8">
                                Enter a high-level objective. The Orchestrator will decompose it into a strategic plan of autonomous tasks.
                            </p>

                            <div className="w-full max-w-2xl relative mb-8">
                                <textarea
                                    value={objective}
                                    onChange={(e) => setObjective(e.target.value)}
                                    placeholder="e.g., 'Research the latest electron security patches and update our security policy'"
                                    className="w-full bg-dark-800 border-2 border-dark-700 rounded-2xl p-4 text-white placeholder:text-dark-600 focus:border-primary-500 focus:outline-none transition-all resize-none h-32 text-lg shadow-xl"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            handleGenerate()
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleGenerate}
                                    disabled={!objective.trim()}
                                    className="absolute bottom-4 right-4 p-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white transition-all shadow-lg hover:shadow-primary-500/20"
                                >
                                    <ArrowRight size={20} />
                                </button>
                            </div>

                            {/* Quick Protocols */}
                            <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
                                <button
                                    onClick={() => setObjective("Use Paper2Code to implement the key algorithm from: ")}
                                    className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-all flex items-center gap-2"
                                >
                                    <Zap size={12} className="fill-current" />
                                    DeepCode: Paper2Code
                                </button>
                                <button
                                    onClick={() => setObjective("Use NanoBanna to create a high-fidelity presentation for: ")}
                                    className="px-4 py-2 bg-pink-500/10 border border-pink-500/30 rounded-xl text-pink-400 text-xs font-bold hover:bg-pink-500/20 transition-all flex items-center gap-2"
                                >
                                    <Bot size={12} />
                                    NanoBanna: Design
                                </button>
                                <button
                                    onClick={() => setObjective("Perform a deep security audit and policy update for: ")}
                                    className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-all flex items-center gap-2"
                                >
                                    <CheckCircle size={12} />
                                    CyberGuard: Audit
                                </button>
                            </div>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <h3 className="text-xl font-bold text-white animate-pulse">Decomposing Objective...</h3>
                            <p className="text-dark-500 mt-2">Consulting Orchestrator Prime</p>
                        </div>
                    )}

                    {plan && !isExecuting && !executionId && (
                        <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-4">
                            <div className="mb-6 flex items-start gap-4 p-4 bg-primary-900/10 border border-primary-500/20 rounded-xl">
                                <div className="mt-1">
                                    <Zap size={18} className="text-primary-400" />
                                </div>
                                <div>
                                    <span className="text-xs font-black text-primary-400 uppercase tracking-widest block mb-1">Strategic Overview</span>
                                    <p className="text-white font-medium text-lg leading-relaxed">"{plan.plan}"</p>
                                </div>
                            </div>

                            <div className="flex-1 bg-dark-950/50 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col">
                                <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-dark-800 rounded-full border border-white/5 text-[10px] font-mono text-dark-500">
                                    {plan.tasks.length} NODES IDENTIFIED
                                </div>
                                {renderGraph()}
                            </div>
                        </div>
                    )}

                    {isExecuting && (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <Play size={32} className="text-green-500 ml-1" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">Mobilizing Swarm</h3>
                            <p className="text-green-400 mt-2 font-mono">Allocating resources & dispatching agents...</p>
                        </div>
                    )}

                    {executionId && (
                        <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in">
                            <CheckCircle size={64} className="text-green-500 mb-6" />
                            <h3 className="text-2xl font-bold text-white">Operation Initiated</h3>
                            <p className="text-dark-400 mt-2">Project ID: <span className="font-mono text-white">{executionId}</span></p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {plan && !isExecuting && !executionId && (
                    <div className="p-6 border-t border-white/5 bg-dark-800/50 flex justify-between">
                        <button
                            onClick={() => setPlan(null)}
                            className="px-6 py-3 rounded-xl hover:bg-white/5 text-dark-400 hover:text-white font-bold transition-all"
                        >
                            Refine Strategy
                        </button>
                        <button
                            onClick={handleExecute}
                            className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg hover:shadow-green-500/20 flex items-center gap-2 transition-all transform hover:scale-105"
                        >
                            <Play size={18} />
                            Execute Swarm
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default GlobalPlanningModal
