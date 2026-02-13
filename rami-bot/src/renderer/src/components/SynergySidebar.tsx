import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Zap, Activity, Brain, CheckCircle, AlertTriangle, Loader2, Play, Terminal } from 'lucide-react'
import { useAppStore } from '../stores/store'

interface SynergyEvent {
    id: string
    type: 'planning' | 'thought' | 'action' | 'result' | 'error' | 'collaboration'
    agentId: string
    agentName: string
    content: string
    timestamp: number
    details?: any
}

function SynergySidebar() {
    const { t } = useTranslation()
    const [events, setEvents] = useState<SynergyEvent[]>([])
    const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set())
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Listen for synergy events from backend
        const removeListeners = [
            window.electron.on('synergy:thought', (data: any) => addEvent('thought', data)),
            window.electron.on('synergy:action', (data: any) => addEvent('action', data)),
            window.electron.on('synergy:result', (data: any) => addEvent('result', data)),
            window.electron.on('org:task_update', (data: any) => {
                // Map old events to new format if needed
                if (data.type === 'planning') addEvent('planning', { ...data, content: data.message })
                if (data.type === 'error') addEvent('error', { ...data, content: data.message })
                if (data.type === 'collaboration') addEvent('collaboration', { ...data, content: data.message })
                if (data.type === 'progress') addEvent('action', { ...data, content: data.message })
            }),
            // NEW: Listen for real-time tool usage from LLMAgent
            window.electron.on('agent:activity', (data: any) => {
                if (data.type === 'tool_use') {
                    addEvent('action', {
                        agentId: data.agentId || 'system',
                        agentName: data.agentName || (data.agentId === 'anthropic' ? 'Claude' : (data.agentId === 'openai' ? 'GPT-4o' : 'Assistant')),
                        content: `🛠️ Using tool: ${data.toolName}`,
                        details: data.details ? (typeof data.details === 'string' ? JSON.parse(data.details) : data.details) : undefined,
                        timestamp: Date.now()
                    })
                } else if (data.type === 'thinking') {
                    addEvent('thought', {
                        agentId: data.agentId || 'system',
                        agentName: data.agentName || 'Agent',
                        content: `🧠 I am processing your request...`,
                        timestamp: Date.now()
                    })
                } else if (data.type === 'responding') {
                    addEvent('thought', {
                        agentId: data.agentId || 'system',
                        agentName: data.agentName || 'Agent',
                        content: `✍️ Formulating final response...`,
                        timestamp: Date.now()
                    })
                }
            })
        ]

        return () => {
            removeListeners.forEach(off => off())
        }
    }, [])

    useEffect(() => {
        // Auto-scroll to bottom
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [events])

    const addEvent = (type: SynergyEvent['type'], data: any) => {
        const newEvent: SynergyEvent = {
            id: `evt_${Date.now()}_${Math.random()}`,
            type,
            agentId: data.agentId,
            agentName: data.agentName,
            content: data.content || data.message || JSON.stringify(data),
            timestamp: data.timestamp || Date.now(),
            details: data.details || data.params
        }

        setEvents(prev => [...prev.slice(-50), newEvent]) // Keep last 50 events

        // Update active agents logic
        setActiveAgents(prev => {
            const next = new Set(prev)
            if (type === 'result' || type === 'error') next.delete(data.agentId)
            else next.add(data.agentId)
            return next
        })
    }

    const getIcon = (type: SynergyEvent['type']) => {
        switch (type) {
            case 'planning': return <Brain size={14} className="text-blue-400" />
            case 'thought': return <Activity size={14} className="text-purple-400" />
            case 'action': return <Play size={14} className="text-yellow-400" />
            case 'result': return <CheckCircle size={14} className="text-green-400" />
            case 'error': return <AlertTriangle size={14} className="text-red-400" />
            case 'collaboration': return <Zap size={14} className="text-cyan-400" />
            default: return <Terminal size={14} className="text-gray-400" />
        }
    }

    return (
        <div className="flex flex-col h-full bg-dark-900 border-l border-dark-700 w-80 shadow-xl">
            <div className="p-3 border-b border-dark-700 bg-dark-800/50 backdrop-blur-sm flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Zap size={16} className="text-purple-500" />
                    Hive Mind Activity
                </h3>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                    {activeAgents.size} Active
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3" ref={scrollRef}>
                {events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-dark-500 space-y-2 opacity-60">
                        <Brain size={32} />
                        <p className="text-xs">Waiting for swarm activity...</p>
                    </div>
                ) : (
                    events.map((evt) => (
                        <div key={evt.id} className="animate-fadeIn relative pl-4 pb-1">
                            {/* Timeline line */}
                            <div className="absolute left-[7px] top-6 bottom-[-12px] w-[1px] bg-dark-700 last:hidden"></div>

                            <div className="flex items-start gap-2 group">
                                <div className={`mt-0.5 relative z-10 bg-dark-900 p-0.5 rounded-full border border-dark-700 group-hover:border-dark-500 transition-colors`}>
                                    {getIcon(evt.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between mb-0.5">
                                        <span className={`text-xs font-bold ${evt.agentName === 'CyberGuard' ? 'text-red-400' :
                                            evt.agentName === 'Orchestrator' ? 'text-blue-400' :
                                                'text-dark-200'
                                            }`}>
                                            {evt.agentName}
                                        </span>
                                        <span className="text-[10px] text-dark-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                            {new Date(evt.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className={`text-xs p-2 rounded-lg border text-dark-300 break-words ${evt.type === 'error' ? 'bg-red-900/10 border-red-900/30' :
                                        evt.type === 'result' ? 'bg-green-900/10 border-green-900/30' :
                                            'bg-dark-800 border-dark-700'
                                        }`}>
                                        {evt.content}
                                        {evt.details && (
                                            <div className="mt-1 pt-1 border-t border-white/5 text-[10px] font-mono text-dark-400 overflow-x-auto">
                                                {JSON.stringify(evt.details, null, 2)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default SynergySidebar
