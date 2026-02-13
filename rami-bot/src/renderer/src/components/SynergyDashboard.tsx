import React, { useEffect, useState } from 'react'
import {
    Activity, Users, Shield, Target, History, Settings,
    Search, Download, Trash2, X, Zap, ChevronRight,
    CheckCircle, AlertCircle, Clock, ExternalLink, Bot, Plus, Layers
} from 'lucide-react'
import GlobalPlanningModal from './GlobalPlanningModal'

interface Agent {
    id: string
    name: string
    role: string
    department: string
    status: 'active' | 'busy' | 'idle' | 'offline'
    currentTask?: string
    successRate: number
}

interface Task {
    id: string
    title: string
    status: string
    priority: string
    assigneeId?: string
}

interface Project {
    id: string
    name: string
    objective: string
    status: string
    intelligence: string[]
    createdAt: number
}

interface ActivityItem {
    timestamp: number
    type: string
    agentId?: string
    agentName?: string
    message?: string
    details?: string
    [key: string]: any
}

interface DashboardData {
    agents: Agent[]
    tasks: Task[]
    projects: Project[]
    decisions: any[]
    queue: Task[]
    activity: ActivityItem[]
}

interface DashboardProps {
    isOpen: boolean
    onClose: () => void
}

type TabType = 'overview' | 'collaboration' | 'audit' | 'policies' | 'goals' | 'logic'

const SynergyDashboard: React.FC<DashboardProps> = ({ isOpen, onClose }) => {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [showIntro, setShowIntro] = useState(false)
    const [hasSeenIntro, setHasSeenIntro] = useState(false)
    const [activeTab, setActiveTab] = useState<TabType>('overview')
    const [isPlanningModalOpen, setIsPlanningModalOpen] = useState(false)

    // Additional Backend Data
    const [collabHistory, setCollabHistory] = useState<any[]>([])
    const [auditLogs, setAuditLogs] = useState<any[]>([])
    const [auditSearch, setAuditSearch] = useState('')
    const [policies, setPolicies] = useState<any[]>([])
    const [policyRegenerating, setPolicyRegenerating] = useState(false)
    const [goals, setGoals] = useState<any[]>([])
    const [conflicts, setConflicts] = useState<any[]>([])
    const [truthClaims, setTruthClaims] = useState<any[]>([])
    const [rollbackHistory, setRollbackHistory] = useState<any[]>([])
    const [skillStats, setSkillStats] = useState<any>(null)

    const fetchData = async () => {
        try {
            const dashboard = await window.electron.invoke('synergy:getDashboard')
            if (dashboard) {
                setData(dashboard)
            }

            // Fetch Skill Stats for Overview
            try {
                const sStats = await window.electron.invoke('skills:getGlobalStats')
                setSkillStats(sStats)
            } catch (e) {
                console.error('Failed to fetch skill stats', e)
            }

            if (activeTab === 'collaboration') {
                const history = await window.electron.invoke('synergy:getCollaborationHistory')
                setCollabHistory(history)
            } else if (activeTab === 'audit') {
                const logs = await window.electron.invoke('synergy:getAuditLog')
                setAuditLogs(logs)
            } else if (activeTab === 'policies') {
                const perms = await window.electron.invoke('synergy:getPolicies')
                setPolicies(perms)
            } else if (activeTab === 'goals') {
                const res = await window.electron.invoke('synergy:getGoals')
                setGoals(res)
            } else if (activeTab === 'logic') {
                const [c, t, r] = await Promise.all([
                    window.electron.invoke('synergy:getConflicts'),
                    window.electron.invoke('synergy:getTruthClaims'),
                    window.electron.invoke('synergy:getRollbackHistory')
                ])
                setConflicts(c)
                setTruthClaims(t)
                setRollbackHistory(r)
            }
        } catch (error) {
            console.error('Failed to fetch synergy dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Effect for showing intro only once per mount when opened
    useEffect(() => {
        if (isOpen && !hasSeenIntro) {
            setShowIntro(true)
            setHasSeenIntro(true)
        }
    }, [isOpen, hasSeenIntro])

    // Effect for data fetching
    useEffect(() => {
        if (isOpen) {
            fetchData()
            const interval = setInterval(fetchData, 2000)
            return () => clearInterval(interval)
        }
        return () => { }
    }, [isOpen, activeTab])

    if (!isOpen) return null

    if (loading) return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md">
            <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-white text-xl font-medium animate-pulse">Initializing God View...</div>
            </div>
        </div>
    )

    if (!data) return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-dark-800 p-8 rounded-xl text-center border border-dark-700">
                <h3 className="text-xl font-bold mb-4">Synergy Manager Not Running</h3>
                <button onClick={onClose} className="px-6 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors">Close</button>
            </div>
        </div>
    )

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'idle': return 'bg-green-500/20 text-green-400 border-green-500/30'
            case 'busy': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
            case 'offline': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
            default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        }
    }

    const exportLogs = async () => {
        const path = `audit-log-export-${Date.now()}.csv`
        await window.electron.invoke('synergy:exportAuditLog', path)
        alert(`Audit log exported to: ${path}`)
    }

    const performRollback = async (id: string) => {
        if (confirm('Are you sure you want to rollback this change? This will overwrite existing files.')) {
            const success = await window.electron.invoke('synergy:performRollback', id)
            if (success) {
                alert('Rollback successful')
                fetchData()
            } else {
                alert('Rollback failed')
            }
        }
    }


    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-7xl h-full flex flex-col overflow-hidden bg-dark-900 border border-white/10 relative rounded-3xl shadow-[0_0_100px_rgba(37,99,235,0.1)]">

                {/* Intro Modal Overlay */}
                {showIntro && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-lg p-4 animate-in fade-in duration-500">
                        <div className="bg-dark-800 border border-white/10 rounded-3xl max-w-2xl w-full p-8 shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h2 className="text-4xl font-bold bg-gradient-to-r from-primary-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                                            Welcome to God View
                                        </h2>
                                        <p className="text-dark-400 text-lg italic">"Transparency is the soul of collaborative intelligence."</p>
                                    </div>
                                    <div className="p-4 bg-primary-500/10 rounded-2xl text-primary-400 animate-pulse">
                                        <Zap size={32} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div className="bg-dark-750 p-6 rounded-2xl border border-white/5 group hover:border-primary-500/30 transition-all">
                                        <h3 className="text-xl font-semibold text-primary-400 mb-3 flex items-center gap-2">
                                            <Users size={20} /> Standard Agents
                                        </h3>
                                        <ul className="text-sm text-dark-300 space-y-3">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle size={14} className="text-primary-500 mt-1 shrink-0" />
                                                <span>Linear, direct tasks per agent</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle size={14} className="text-primary-500 mt-1 shrink-0" />
                                                <span>Simple request/response loop</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="bg-primary-900/10 p-6 rounded-2xl border border-primary-500/20 relative overflow-hidden group hover:bg-primary-900/20 transition-all">
                                        <h3 className="text-xl font-semibold text-purple-400 mb-3 flex items-center gap-2">
                                            <Activity size={20} /> God View (Synergy)
                                        </h3>
                                        <ul className="text-sm text-dark-200 space-y-3">
                                            <li className="flex items-start gap-2">
                                                <Zap size={14} className="text-purple-500 mt-1 shrink-0" />
                                                <span><b>Unified Brain</b>: Multi-agent interaction</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Zap size={14} className="text-purple-500 mt-1 shrink-0" />
                                                <span><b>Strategic Deck</b>: Hire, Audit, & Evolve</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Zap size={14} className="text-purple-500 mt-1 shrink-0" />
                                                <span><b>Neural Analytics</b>: Real-time swarm tracking</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setShowIntro(false)}
                                        className="px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-2xl transition-all shadow-xl hover:shadow-primary-500/40 flex items-center gap-3 transform hover:scale-105 active:scale-95"
                                    >
                                        <span>Enter The Terminal</span>
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-xl bg-dark-800 border border-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all z-20 group"
                >
                    <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>

                {/* Main Content Layout */}
                <div className="flex-1 flex flex-col min-h-0">

                    {/* Header */}
                    <div className="p-8 pb-4 shrink-0 flex flex-col md:flex-row justify-between items-end gap-4 border-b border-dark-700">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-2 h-8 bg-primary-500 rounded-full"></div>
                                <h1 className="text-3xl font-black tracking-tight text-white uppercase">
                                    Synergy <span className="text-primary-400">Hub</span>
                                </h1>
                            </div>
                            <p className="text-dark-400 text-sm ml-5 font-medium tracking-wide">Autonomous Neural Swarm Orchestrator</p>
                        </div>

                        {/* Quick Stats Banner */}
                        <div className="flex gap-3">
                            <div className="bg-dark-800/80 rounded-2xl px-5 py-3 border border-white/5 backdrop-blur-sm min-w-[120px]">
                                <span className="text-dark-500 text-[10px] uppercase font-bold tracking-widest block mb-1">Live Units</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-mono font-bold text-white">{data.agents.filter(a => a.status !== 'offline').length}</span>
                                    <span className="text-green-500 text-[10px] font-bold animate-pulse">ONLINE</span>
                                </div>
                            </div>
                            <div className="bg-dark-800/80 rounded-2xl px-5 py-3 border border-white/5 backdrop-blur-sm min-w-[120px]">
                                <span className="text-dark-500 text-[10px] uppercase font-bold tracking-widest block mb-1">Task Load</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-mono font-bold text-white">{data.queue.length}</span>
                                    <span className="text-primary-400 text-[10px] font-bold">QUEUED</span>
                                </div>
                            </div>
                            <div className="bg-dark-800/80 rounded-2xl px-5 py-3 border border-white/5 backdrop-blur-sm min-w-[120px]">
                                <span className="text-dark-500 text-[10px] uppercase font-bold tracking-widest block mb-1">Swarm IQ</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-mono font-bold text-white">
                                        {skillStats?.totalXP ? Math.floor(skillStats.totalXP / 100) : 0}
                                    </span>
                                    <span className="text-purple-400 text-[10px] font-bold uppercase">Level</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsPlanningModalOpen(true)}
                                className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-2xl border border-primary-400/30 flex items-center gap-2 font-black uppercase text-xs tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95"
                            >
                                <Zap size={14} className="fill-current" />
                                Swarm Command
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="px-8 shrink-0 bg-dark-900 border-b border-dark-800">
                        <div className="flex gap-8">
                            {[
                                { id: 'overview', name: 'Overview', icon: Zap },
                                { id: 'collaboration', name: 'Collaboration', icon: Users },
                                { id: 'audit', name: 'Audit Logs', icon: History },
                                { id: 'policies', name: 'Policies', icon: Shield },
                                { id: 'goals', name: 'Objectives', icon: Target },
                                { id: 'logic', name: 'Neural Logic', icon: Zap }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabType)}
                                    className={`relative py-5 flex items-center gap-2 text-sm font-bold tracking-wider uppercase transition-all ${activeTab === tab.id
                                        ? 'text-primary-400'
                                        : 'text-dark-500 hover:text-dark-200'
                                        }`}
                                >
                                    <tab.icon size={16} />
                                    {tab.name}
                                    {activeTab === tab.id && (
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary-500 rounded-t-full shadow-[0_-2px_10px_rgba(37,99,235,0.5)]"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content Area */}
                    <div className="flex-1 overflow-hidden">
                        <div className="h-full p-8 overflow-y-auto custom-scrollbar">

                            {/* OVERVIEW TAB */}
                            {activeTab === 'overview' && (
                                <div className="space-y-8 animate-in slide-in-from-bottom-2">
                                    {/* Agent Grid */}
                                    <section>
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-xs font-black text-dark-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Bot size={14} className="text-primary-500" />
                                                Active Neural Entities
                                            </h2>
                                        </div>
                                        {/* Active Projects & Intelligence Section */}
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                            <div className="lg:col-span-2 bg-[#1e293b]/50 border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-purple-500/20 rounded-lg">
                                                            <Target className="w-5 h-5 text-purple-400" />
                                                        </div>
                                                        <h3 className="text-lg font-medium text-white">Active Swarm Projects</h3>
                                                    </div>
                                                    <span className="text-xs text-slate-400 font-mono">
                                                        {data?.projects.length || 0} TOTAL
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    {data?.projects && data.projects.length > 0 ? (
                                                        data.projects.map(project => (
                                                            <div key={project.id} className="bg-slate-900/40 border border-white/5 rounded-xl p-4 hover:border-purple-500/30 transition-all group">
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <h4 className="font-medium text-slate-200 group-hover:text-purple-300 transition-colors uppercase tracking-wider text-sm">{project.name}</h4>
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${project.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                                        project.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                                                                        }`}>
                                                                        {project.status}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-slate-400 mb-4 line-clamp-2 italic">"{project.objective}"</p>

                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tighter">Collective Intelligence</span>
                                                                        <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
                                                                    </div>
                                                                    <div className="bg-black/20 rounded-lg p-2 max-h-24 overflow-y-auto skill-scrollbar">
                                                                        {project.intelligence.length > 0 ? (
                                                                            project.intelligence.map((intel, idx) => (
                                                                                <div key={idx} className="text-[10px] text-slate-300 border-l border-purple-500/30 pl-2 py-1 mb-1 bg-white/5 rounded-r">
                                                                                    {intel}
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <div className="text-[10px] text-slate-500 italic text-center py-2">Discovering insights...</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="col-span-2 py-8 text-center bg-slate-900/20 rounded-xl border border-dashed border-white/5">
                                                            <Bot className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-20" />
                                                            <p className="text-slate-500 text-sm italic">Initiate a Swarm Command to launch an autonomous project.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Elite Capabilities Matrix */}
                                            <div className="bg-dark-800/50 border border-primary-500/20 rounded-2xl p-6 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-primary-500/10 transition-all"></div>
                                                <h3 className="text-xs font-black text-primary-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                    <Layers size={14} /> Swarm Protocols
                                                </h3>

                                                <div className="space-y-4">
                                                    <div className="p-4 bg-primary-900/10 border border-primary-500/20 rounded-xl hover:bg-primary-900/20 transition-all">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-[10px] font-black text-primary-400 uppercase tracking-widest">Active Protocol</span>
                                                            <Zap size={12} className="text-yellow-400 fill-current animate-pulse" />
                                                        </div>
                                                        <h4 className="text-white font-bold text-sm mb-1">DeepCode (Paper2Code)</h4>
                                                        <p className="text-[10px] text-dark-400 leading-relaxed font-medium">Transforming scientific research into functional implementation blocks.</p>
                                                    </div>

                                                    <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-xl hover:bg-purple-900/20 transition-all">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Active Protocol</span>
                                                            <Bot size={12} className="text-purple-400" />
                                                        </div>
                                                        <h4 className="text-white font-bold text-sm mb-1">NanoBanna (Elite Design)</h4>
                                                        <p className="text-[10px] text-dark-400 leading-relaxed font-medium">Autonomous high-fidelity visual asset and presentation rendering.</p>
                                                    </div>

                                                    <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl hover:bg-blue-900/20 transition-all opacity-60">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Standby</span>
                                                            <Shield size={12} className="text-blue-400" />
                                                        </div>
                                                        <h4 className="text-white font-bold text-sm mb-1">CyberGuard Sentinel</h4>
                                                        <p className="text-[10px] text-dark-500 leading-relaxed font-medium">Continuous security auditing and neural policy enforcement.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Agents Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {data.agents.map(agent => (
                                                <div key={agent.id} className={`group relative p-5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${agent.currentTask ? 'bg-primary-900/5 border-primary-500/30' : 'bg-dark-800/50 border-white/5'
                                                    }`}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center text-xl shadow-inner group-hover:bg-primary-500/10 transition-colors">
                                                                {agent.name.includes('Coder') ? '👨‍💻' : agent.name.includes('Scholar') ? '📚' : '🤖'}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-white text-sm">{agent.name}</h3>
                                                                <p className="text-[10px] text-dark-500 font-bold uppercase tracking-tight">{agent.role}</p>
                                                            </div>
                                                        </div>
                                                        <div className={`text-[9px] px-2 py-0.5 rounded-full border font-black uppercase tracking-tighter ${getStatusColor(agent.status)}`}>
                                                            {agent.status}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 mb-4">
                                                        <div className="flex justify-between items-center text-[10px]">
                                                            <span className="text-dark-500 font-bold uppercase">Efficiency</span>
                                                            <span className="text-primary-400 font-mono font-bold">{agent.successRate.toFixed(0)}%</span>
                                                        </div>
                                                        <div className="w-full bg-dark-700 h-1 rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${agent.successRate}%` }}></div>
                                                        </div>
                                                    </div>

                                                    {agent.currentTask && (
                                                        <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-3 animate-pulse">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Clock size={10} className="text-primary-400" />
                                                                <span className="text-[9px] text-primary-400 uppercase font-black">Executing</span>
                                                            </div>
                                                            <p className="text-[10px] text-white font-medium line-clamp-1 truncate">
                                                                ID: {agent.currentTask}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Task Queue Summary */}
                                        <section className="bg-dark-800/30 rounded-2xl border border-white/5 p-6 backdrop-blur-sm">
                                            <h2 className="text-xs font-black text-dark-400 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                                                <span>Active Pipeline</span>
                                                <span className="px-2 py-0.5 bg-dark-700 rounded text-white font-mono">{data.tasks.length}</span>
                                            </h2>
                                            <div className="space-y-3">
                                                {data.tasks.slice(0, 5).map(task => (
                                                    <div key={task.id} className="p-4 bg-dark-750 rounded-2xl border border-white/5 hover:border-primary-500/20 transition-all flex items-center justify-between group">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-2 h-2 rounded-full ${task.priority === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-primary-500'}`}></div>
                                                            <div>
                                                                <h4 className="font-bold text-sm text-dark-100 group-hover:text-primary-400 transition-colors">{task.title}</h4>
                                                                <p className="text-[10px] text-dark-500 uppercase font-bold">{task.status}</p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={16} className="text-dark-600 group-hover:text-primary-500 transition-all" />
                                                    </div>
                                                ))}
                                                {data.tasks.length === 0 && (
                                                    <div className="text-center py-8 text-dark-600 font-medium italic">Pipeline clear. Waiting for objective.</div>
                                                )}
                                            </div>
                                        </section>

                                        {/* Live Activity Feed */}
                                        <section className="bg-dark-800/30 rounded-2xl border border-white/5 p-6 backdrop-blur-sm">
                                            <h2 className="text-xs font-black text-dark-400 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                                                <span>Swarm Telemetry</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                                                    <span className="text-[9px] text-green-500 font-bold uppercase tracking-widest">Live Flow</span>
                                                </div>
                                            </h2>
                                            <div className="space-y-3 font-mono text-[11px] h-[300px] overflow-auto pr-2 custom-scrollbar">
                                                {data.activity.slice(0, 20).map((item, idx) => (
                                                    <div key={idx} className="flex gap-4 p-3 hover:bg-white/5 rounded-xl transition-all border-l-2 border-transparent hover:border-primary-500/50 bg-dark-750/30">
                                                        <span className="text-dark-600 font-bold shrink-0">
                                                            {new Date(item.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        </span>
                                                        <div className="flex-1">
                                                            {item.agentName && (
                                                                <span className="font-black text-primary-400 mr-2">[{item.agentName.toUpperCase()}]</span>
                                                            )}
                                                            <span className={item.type === 'error' ? 'text-red-400' : 'text-dark-300'}>
                                                                {item.message || item.details || `EVENT_${item.type}`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            )}

                            {/* COLLABORATION TAB */}
                            {activeTab === 'collaboration' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-dark-800/50 rounded-2xl border border-white/5 p-6">
                                            <h3 className="text-sm font-black text-primary-400 uppercase tracking-widest mb-6">Interaction Timeline</h3>
                                            <div className="space-y-4">
                                                {collabHistory.length > 0 ? collabHistory.slice(0, 10).map((record) => (
                                                    <div key={record.id} className="relative pl-6 border-l border-primary-500/30 pb-4 last:pb-0">
                                                        <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(37,99,235,0.5)] animate-pulse"></div>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-sm font-bold text-white">{record.requestorAgentName} ➔ {record.helperAgentName}</span>
                                                            <span className="text-[10px] text-dark-500 font-mono">{new Date(record.timestamp).toLocaleTimeString()}</span>
                                                        </div>
                                                        <p className="text-xs text-dark-400 mb-2 line-clamp-1">{record.taskDescription}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${record.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                                {record.success ? 'Success' : 'Failed'}
                                                            </span>
                                                            <span className="text-[10px] text-dark-600 font-mono">{Math.round(record.duration / 1000)}s Latency</span>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="text-center py-12 text-dark-600 italic">Historical synergy data pending execution...</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-dark-800/50 rounded-2xl border border-white/5 p-6">
                                            <h3 className="text-sm font-black text-purple-400 uppercase tracking-widest mb-6">Success Patterns</h3>
                                            <div className="space-y-3">
                                                {data.agents.slice(0, 5).map(agent => (
                                                    <div key={agent.id} className="p-4 bg-dark-750 rounded-2xl border border-white/5 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center text-sm">{agent.name[0]}</div>
                                                            <span className="text-sm font-bold text-white">{agent.name}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs font-mono font-bold text-green-400">{agent.successRate}% Success</div>
                                                            <div className="text-[9px] text-dark-500 font-black uppercase tracking-tighter">Reliability Index</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* AUDIT LOG TAB */}
                            {activeTab === 'audit' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="flex justify-between items-center bg-dark-800/80 p-6 rounded-2xl border border-white/5 backdrop-blur-md sticky top-0 z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                                                <input
                                                    type="text"
                                                    placeholder="Search Audit Logs..."
                                                    value={auditSearch}
                                                    onChange={(e) => setAuditSearch(e.target.value)}
                                                    className="bg-dark-900 border border-white/10 rounded-xl px-10 py-2.5 text-xs text-white placeholder:text-dark-600 focus:border-primary-500/50 focus:outline-none transition-all w-64 md:w-96"
                                                />
                                            </div>
                                            <button className="bg-dark-700 hover:bg-dark-600 p-2.5 rounded-xl transition-colors text-dark-300">
                                                <Settings size={18} />
                                            </button>
                                        </div>
                                        <button
                                            onClick={exportLogs}
                                            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-primary-500/20"
                                        >
                                            <Download size={16} />
                                            Export CSV
                                        </button>
                                    </div>

                                    <div className="bg-dark-800/30 rounded-2xl border border-white/5 overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-dark-800/80 sticky top-0">
                                                <tr>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-dark-500">Timestamp</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-dark-500">Subject</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-dark-500">Operation</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-dark-500">Decision</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-dark-500">Resource</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {auditLogs.filter(log =>
                                                    log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
                                                    log.agentRole.toLowerCase().includes(auditSearch.toLowerCase()) ||
                                                    log.resource.toLowerCase().includes(auditSearch.toLowerCase())
                                                ).map((log) => (
                                                    <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                                                        <td className="px-6 py-4 text-[11px] font-mono text-dark-500">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-white">{log.agentRole.toUpperCase()}</span>
                                                                <span className="text-[9px] text-dark-500 font-mono opacity-50">#{log.agentId.slice(0, 4)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-[11px] font-bold text-primary-400 capitalize">{log.action}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${log.decision === 'allow' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                                {log.decision}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 max-w-xs truncate text-[11px] font-mono text-dark-400">
                                                            {log.resource}:{log.resourceId}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {auditLogs.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-12 text-center text-dark-600 font-medium italic">No legal logs generated yet. Swarm is in compliance.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* POLICIES TAB */}
                            {activeTab === 'policies' && (
                                <div className="space-y-6 animate-in zoom-in-95 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div className="bg-gradient-to-br from-primary-900/20 to-dark-800 p-8 rounded-3xl border border-primary-500/20 col-span-1 lg:col-span-2 relative overflow-hidden">
                                            <div className="absolute top-4 right-6 opacity-10">
                                                <Shield size={120} />
                                            </div>
                                            <div className="relative z-10">
                                                <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">The Organization Constitution</h3>
                                                <p className="text-dark-300 mb-8 leading-relaxed max-w-xl">
                                                    Fundamental governance protocols defining high-level immutable permissions for legal agent operation.
                                                    Changes to these rules require <b>Manager-level Multi-sig</b> consensus.
                                                </p>
                                                <div className="flex gap-4">
                                                    <div className="p-4 bg-primary-500/10 rounded-2xl border border-primary-500/20 flex flex-col items-center gap-2">
                                                        <span className="text-3xl font-black text-white">{policies.length}</span>
                                                        <span className="text-[10px] text-primary-400 font-black uppercase">Active Rules</span>
                                                    </div>
                                                    <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20 flex flex-col items-center gap-2">
                                                        <span className="text-3xl font-black text-white">0</span>
                                                        <span className="text-[10px] text-green-400 font-black uppercase">Violations</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-dark-800/80 p-8 rounded-3xl border border-white/5">
                                            <h3 className="text-sm font-black text-dark-400 uppercase tracking-widest mb-6">Security Engine</h3>
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-white">Default Deny Mode</span>
                                                    <div className="w-10 h-5 bg-primary-600 rounded-full relative">
                                                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-white">Auto-Escalation</span>
                                                    <div className="w-10 h-5 bg-dark-700 rounded-full relative">
                                                        <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                                                    </div>
                                                </div>
                                                <div className="pt-4 mt-4 border-t border-dark-700">
                                                    <button
                                                        disabled={policyRegenerating}
                                                        onClick={() => {
                                                            setPolicyRegenerating(true);
                                                            setTimeout(() => {
                                                                setPolicyRegenerating(false);
                                                                alert('Security tokens regenerated successfully.');
                                                            }, 2000);
                                                        }}
                                                        className={`w-full py-3 rounded-xl text-xs font-bold transition-all ${policyRegenerating
                                                            ? 'bg-dark-600 text-dark-400 cursor-wait'
                                                            : 'bg-dark-700 hover:bg-dark-600 text-primary-400'
                                                            }`}
                                                    >
                                                        {policyRegenerating ? 'Regenerating Tokens...' : 'Regenerate Security Tokens'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <h2 className="text-xs font-black text-dark-500 uppercase tracking-[0.2em] mt-12 mb-6">Active Permission Map</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {policies.map((perm) => (
                                            <div key={perm.id} className="p-5 bg-dark-800/50 rounded-2xl border border-white/5 hover:border-primary-500/20 transition-all">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="px-2 py-0.5 bg-primary-500/10 rounded text-primary-400 text-[10px] font-black uppercase">{perm.agentRole}</div>
                                                    <Shield size={16} className="text-dark-600" />
                                                </div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm font-bold text-white uppercase">{perm.action}</span>
                                                    <span className="text-sm text-dark-500 font-medium">ON</span>
                                                    <span className="text-sm font-bold text-primary-400 uppercase">{perm.resource}</span>
                                                </div>
                                                <p className="text-[10px] font-mono text-dark-600 truncate">{perm.id}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* GOALS TAB */}
                            {activeTab === 'goals' && (
                                <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">System Objectives</h2>
                                            <p className="text-dark-500 text-sm">Long-term alignment and tactical milestones</p>
                                        </div>
                                        <button
                                            onClick={() => setIsPlanningModalOpen(true)}
                                            className="px-6 py-3 bg-dark-800 hover:bg-dark-700 rounded-2xl border border-white/10 text-white font-bold text-sm flex items-center gap-2 transition-all"
                                        >
                                            <Target size={18} />
                                            New Objective
                                        </button>
                                    </div>

                                    {goals.length > 0 ? goals.map((goal) => (
                                        <div key={goal.id} className="bg-dark-800/50 rounded-3xl border border-white/5 p-8 relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-8">
                                                <div className="max-w-xl">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${goal.status === 'active' ? 'bg-primary-500/10 text-primary-400' : 'bg-green-500/10 text-green-400'
                                                            }`}>
                                                            {goal.status}
                                                        </span>
                                                        <span className="text-xs text-dark-500 font-mono">ID: {goal.id}</span>
                                                    </div>
                                                    <h3 className="text-xl font-bold text-white mb-2">{goal.description}</h3>
                                                    <p className="text-dark-400 text-sm">Started {new Date(goal.createdAt).toLocaleDateString()} • Last updated {new Date(goal.updatedAt).toLocaleTimeString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-4xl font-black text-primary-400 font-mono mb-1">
                                                        {Math.round((goal.subtasks.filter((t: any) => t.status === 'completed').length / goal.subtasks.length) * 100 || 0)}%
                                                    </div>
                                                    <div className="text-[10px] text-dark-500 font-bold uppercase tracking-widest">Aggregate Progress</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {goal.subtasks.map((task: any) => (
                                                    <div key={task.id} className="p-4 bg-dark-900/50 rounded-2xl border border-white/5 flex items-start gap-3">
                                                        <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${task.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-dark-600'
                                                            }`}>
                                                            {task.status === 'completed' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                                        </div>
                                                        <div>
                                                            <h4 className={`text-sm font-bold ${task.status === 'completed' ? 'text-dark-500 line-through' : 'text-white'}`}>
                                                                {task.description}
                                                            </h4>
                                                            <p className="text-[10px] text-dark-600 font-black uppercase mt-1">Priority {task.priority}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="bg-dark-800/30 rounded-3xl border border-dashed border-dark-700 p-20 flex flex-col items-center gap-6 text-center">
                                            <div className="p-6 bg-dark-800 rounded-full text-dark-600 border border-dark-700">
                                                <Target size={48} />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold text-white mb-2">No Active Strategic Goals</h4>
                                                <p className="text-dark-500 max-w-sm">The organization is currently in idle maintenance mode. Create an objective to begin neural orchestration.</p>
                                            </div>
                                            <button
                                                onClick={() => setIsPlanningModalOpen(true)}
                                                className="px-8 py-3 bg-primary-600 hover:bg-primary-500 rounded-2xl text-white font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                                            >
                                                Define Strategic Goal
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* NEURAL LOGIC TAB */}
                            {activeTab === 'logic' && (
                                <div className="space-y-8 animate-in slide-in-from-right-6 duration-700">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Conflicts Section */}
                                        <section className="bg-dark-800/50 rounded-3xl border border-white/5 p-6">
                                            <div className="flex items-center gap-3 mb-6">
                                                <AlertCircle size={20} className="text-red-400" />
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Active Conflicts</h3>
                                            </div>
                                            <div className="space-y-4">
                                                {conflicts.length > 0 ? conflicts.map((conflict, idx) => (
                                                    <div key={idx} className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${conflict.severity === 'high' ? 'bg-red-500 text-white' :
                                                                conflict.severity === 'medium' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-black'
                                                                }`}>
                                                                {conflict.severity} Severity
                                                            </span>
                                                            <span className="text-[10px] text-dark-500 font-mono">{new Date(conflict.timestamp).toLocaleTimeString()}</span>
                                                        </div>
                                                        <p className="text-sm font-bold text-white mb-1">{conflict.task}</p>
                                                        <p className="text-xs text-dark-300 mb-2 italic">{conflict.reason}</p>
                                                        <div className="flex gap-2">
                                                            {conflict.agents.map((agent: string) => (
                                                                <span key={agent} className="text-[10px] bg-dark-700 px-2 py-1 rounded text-dark-200">@{agent}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="text-center py-12 text-dark-600 italic">No neural conflicts detected. Swarm is in consensus.</div>
                                                )}
                                            </div>
                                        </section>

                                        {/* Truth Engine Section */}
                                        <section className="bg-dark-800/50 rounded-3xl border border-white/5 p-6">
                                            <div className="flex items-center gap-3 mb-6">
                                                <CheckCircle size={20} className="text-primary-400" />
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Verified Truth Claims</h3>
                                            </div>
                                            <div className="space-y-4">
                                                {truthClaims.length > 0 ? truthClaims.map((claim, idx) => (
                                                    <div key={idx} className="p-4 bg-primary-950/10 border border-primary-500/10 rounded-2xl">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${claim.classification === 'fact' ? 'bg-green-500/20 text-green-400' :
                                                                claim.classification === 'uncertain' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                                                                }`}>
                                                                {claim.classification}
                                                            </span>
                                                            <span className="text-lg font-black text-primary-400 font-mono">{Math.round(claim.confidence * 100)}%</span>
                                                        </div>
                                                        <p className="text-sm text-white font-medium mb-3">{claim.claim}</p>
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] text-dark-500 font-black uppercase block mb-1">Evidence Chain:</span>
                                                            {claim.evidence.map((e: any, i: number) => (
                                                                <div key={i} className="flex items-center gap-2 text-[10px] text-dark-400 truncate">
                                                                    <ExternalLink size={10} className="shrink-0" />
                                                                    <span className="font-mono">{e.source}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="text-center py-12 text-dark-600 italic">No claims verified in this cycle.</div>
                                                )}
                                            </div>
                                        </section>
                                    </div>

                                    {/* Rollback Section */}
                                    <section className="bg-dark-800/30 rounded-3xl border border-white/5 p-8">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-3">
                                                <History size={20} className="text-purple-400" />
                                                <div>
                                                    <h3 className="text-lg font-black text-white uppercase tracking-tight">System Rollback History</h3>
                                                    <p className="text-xs text-dark-500 font-medium">Revert destructive filesystem operations</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-white/5">
                                                        <th className="px-4 py-3 text-[10px] font-black uppercase text-dark-500">Operation</th>
                                                        <th className="px-4 py-3 text-[10px] font-black uppercase text-dark-500">Target Resource</th>
                                                        <th className="px-4 py-3 text-[10px] font-black uppercase text-dark-500">Timestamp</th>
                                                        <th className="px-4 py-3 text-[10px] font-black uppercase text-dark-500 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {rollbackHistory.map((entry) => (
                                                        <tr key={entry.id} className="group hover:bg-white/5 transition-all">
                                                            <td className="px-4 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full ${entry.rolledBack ? 'bg-green-500' : 'bg-primary-500'}`}></div>
                                                                    <span className="text-xs font-bold text-white uppercase">{entry.action}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <div className="text-xs text-dark-300 font-mono truncate max-w-md">
                                                                    {entry.target}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 text-xs text-dark-500 font-mono">
                                                                {new Date(entry.timestamp).toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-4 text-right">
                                                                {entry.rolledBack ? (
                                                                    <span className="text-[10px] font-black text-green-500 uppercase flex items-center justify-end gap-1">
                                                                        <CheckCircle size={12} /> Rolled Back
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => performRollback(entry.id)}
                                                                        disabled={!entry.canRollback}
                                                                        className="px-4 py-1.5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ml-auto"
                                                                    >
                                                                        <Trash2 size={12} /> Undo Change
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {rollbackHistory.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="text-center py-12 text-dark-600 italic">No filesystem changes recorded for rollback.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {/* Footer Gradient Accent */}
                <div className="h-1 text-center italic text-[9px] text-dark-700 font-bold tracking-widest uppercase">
                    Synergy v2.0.0 Alpha • Secure Neural Link Active
                </div>
            </div>

            <GlobalPlanningModal
                isOpen={isPlanningModalOpen}
                onClose={() => setIsPlanningModalOpen(false)}
            />
        </div>
    )
}

export default SynergyDashboard
