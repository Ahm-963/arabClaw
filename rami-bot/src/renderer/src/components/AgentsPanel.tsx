import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bot, Plus, Edit2, Trash2, Play, Pause, Users, Zap,
  Settings, Copy, MoreVertical, Check, X, Sparkles,
  Brain, Code, Search, Calendar, Shield, Palette,
  History as HistoryIcon
} from 'lucide-react'
import { AgentCreatorModal } from './AgentCreatorModal'

interface Agent {
  id: string
  name: string
  personality: string
  systemPrompt: string
  skills: string[]
  color: string
  avatar: string
  isActive: boolean
  createdAt: number
  lastUsed: number
}

interface AgentsPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelectAgent: (agentId: string) => void
  currentAgentId?: string
  initialMode?: 'default' | 'collaboration'
}

const AVATAR_OPTIONS = ['🤖', '👨‍💻', '🔍', '📋', '⚙️', '🧠', '🎨', '📊', '🛡️', '🚀', '💡', '🔮']
const COLOR_OPTIONS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

function AgentsPanel({ isOpen, onClose, onSelectAgent, currentAgentId, initialMode = 'default' }: AgentsPanelProps) {
  const { t } = useTranslation()
  const [agents, setAgents] = useState<Agent[]>([])
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false)
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [collaborationMode, setCollaborationMode] = useState(false)
  const [collaborationTask, setCollaborationTask] = useState('')

  // Collaboration Progress State
  const [isCollaborating, setIsCollaborating] = useState(false)
  const [collaborationLog, setCollaborationLog] = useState<string[]>([])
  const [collaborationResult, setCollaborationResult] = useState<any>(null)

  // Skill Progression State
  const [agentProfiles, setAgentProfiles] = useState<Record<string, any>>({})

  // Analytics & Metrics State
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list')
  const [agentMetrics, setAgentMetrics] = useState<any[]>([])
  const [collaborationGraph, setCollaborationGraph] = useState<any>({ nodes: [], links: [] })
  const [collaborationHistory, setCollaborationHistory] = useState<any[]>([])

  useEffect(() => {
    loadAgents()
    loadSkillProfiles()
    if (activeTab === 'analytics') {
      loadAnalytics()
    }
    // Listen for agent activity events
    const unsubscribe = window.electron?.onAgentActivity?.((activity: any) => {
      if (activity.type === 'collaboration_started') {
        setIsCollaborating(true)
        setCollaborationLog(prev => [...prev, '🚀 Collaboration started...'])
      }
      if (activity.type === 'task_started' && activity.details?.startsWith('Subtask:')) {
        setCollaborationLog(prev => [...prev, `👉 ${activity.details}`])
      }
      if (activity.type === 'collaboration_completed') {
        setCollaborationLog(prev => [...prev, '✅ Collaboration completed!'])
        // We might need to fetch the final result or waiting for the promise to resolve
      }
    })
    return () => unsubscribe?.()
  }, [])

  useEffect(() => {
    if (isOpen && initialMode === 'collaboration') {
      setCollaborationMode(true)
    } else if (isOpen) {
      setCollaborationMode(false)
      setIsCollaborating(false)
      setCollaborationLog([])
      setCollaborationResult(null)
    }
  }, [isOpen, initialMode])

  const loadAgents = async () => {
    try {
      const loaded = await window.electron?.getAgents()
      if (loaded) setAgents(loaded)
    } catch (e) {
      // Default agents for demo
      // ...
    }
  }

  const loadAnalytics = async () => {
    try {
      const metrics = await window.electron.getAgentMetrics()
      setAgentMetrics(metrics)

      const graph = await window.electron.getCollaborationGraph()
      setCollaborationGraph(graph)

      // Mock or fetch collaboration history
      setCollaborationHistory([
        { id: '1', task: 'Fix authentication bug', status: 'completed', time: Date.now() - 3600000, participants: ['Rami', 'CodeMaster'] },
        { id: '2', task: 'Draft marketing copy', status: 'completed', time: Date.now() - 7200000, participants: ['Writer', 'Social'] },
        { id: '3', task: 'Analyze server logs', status: 'completed', time: Date.now() - 10800000, participants: ['CyberGuard', 'CodeMaster'] }
      ])
    } catch (error) {
      console.error('Failed to load agent analytics:', error)
    }
  }

  const loadSkillProfiles = async () => {
    try {
      const profiles = await window.electron.getAllProfiles()
      const profileMap: Record<string, any> = {}
      profiles.forEach((p: any) => {
        profileMap[p.agentId] = p
      })
      setAgentProfiles(profileMap)
    } catch (error) {
      console.error('Failed to load skill profiles:', error)
    }
  }

  const calculateLevel = (totalXP: number) => {
    if (totalXP >= 1850) return 'Master'
    if (totalXP >= 850) return 'Expert'
    if (totalXP >= 350) return 'Advanced'
    if (totalXP >= 100) return 'Intermediate'
    return 'Beginner'
  }

  const createAgent = async () => {
    setIsCreatorModalOpen(true)
  }

  const handleAgentCreated = async (agent: any) => {
    console.log('[AgentsPanel] New agent created:', agent)
    // Reload agents list to show newly created agent
    await loadAgents()
  }

  const saveAgent = async (agent: Agent) => {
    const updated = agents.map(a => a.id === agent.id ? agent : a)
    setAgents(updated)
    setEditingAgent(null)
    setIsCreating(false)
    try {
      await window.electron?.saveAgent(agent)
    } catch (e) { }
  }

  const deleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return
    setAgents(agents.filter(a => a.id !== id))
    try {
      await window.electron?.deleteAgent(id)
    } catch (e) { }
  }

  const toggleAgentSelection = (id: string) => {
    if (selectedAgents.includes(id)) {
      setSelectedAgents(selectedAgents.filter(a => a !== id))
    } else {
      setSelectedAgents([...selectedAgents, id])
    }
  }

  const startCollaboration = async () => {
    if (selectedAgents.length < 2 || !collaborationTask) return

    setIsCollaborating(true)
    setCollaborationLog(['⏳ Planning collaboration...'])

    try {
      const result = await window.electron?.startCollaboration(selectedAgents, collaborationTask)
      setCollaborationResult(result)
      // We don't close immediately so user can see results
      // setCollaborationMode(false)
      // setSelectedAgents([])
      // setCollaborationTask('')
      // onClose()
    } catch (e: any) {
      setCollaborationLog(prev => [...prev, `❌ Error: ${e.message}`])
    }
  }

  const handleClose = () => {
    // Reset everything on close
    setCollaborationMode(false)
    setIsCollaborating(false)
    setCollaborationLog([])
    setCollaborationResult(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-2xl w-[900px] max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <Bot size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t('agents.title', 'AI Agents')}</h2>
              <div className="flex gap-4 mt-1">
                <button
                  onClick={() => setActiveTab('list')}
                  className={`text-sm ${activeTab === 'list' ? 'text-primary-400 font-bold border-b-2 border-primary-400' : 'text-dark-400 hover:text-dark-200'}`}
                >
                  {t('agents.listTab', 'Agent List')}
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`text-sm ${activeTab === 'analytics' ? 'text-primary-400 font-bold border-b-2 border-primary-400' : 'text-dark-400 hover:text-dark-200'}`}
                >
                  {t('agents.analyticsTab', 'Performance')}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isCollaborating && activeTab === 'list' && (
              <>
                <button
                  onClick={() => setCollaborationMode(!collaborationMode)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${collaborationMode ? 'bg-primary-600 text-white' : 'bg-dark-700 hover:bg-dark-600'
                    }`}
                >
                  <Users size={18} />
                  {t('agents.collaborate', 'Collaborate')}
                </button>
                <button
                  onClick={createAgent}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus size={18} />
                  {t('agents.create', 'Create Agent')}
                </button>
              </>
            )}
            <button onClick={handleClose} className="p-2 hover:bg-dark-700 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Collaboration Running View */}
          {isCollaborating ? (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="bg-dark-750 rounded-xl p-6 border border-dark-700 mb-6">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <Zap size={20} className={collaborationResult ? "text-green-500" : "text-yellow-500 animate-pulse"} />
                  {collaborationResult ? "Collaboration Completed" : "Collaboration in Progress"}
                </h3>
                <p className="text-dark-300 mb-4">Task: "{collaborationTask}"</p>

                {/* Agents involved */}
                <div className="flex -space-x-3 overflow-hidden py-2 mb-4">
                  {selectedAgents.map(id => {
                    const agent = agents.find(a => a.id === id)
                    if (!agent) return null
                    return (
                      <div key={id} title={agent.name} className="inline-block h-10 w-10 rounded-full ring-2 ring-dark-800 bg-dark-600 flex items-center justify-center text-xl">
                        {agent.avatar}
                      </div>
                    )
                  })}
                </div>

                {/* Logs */}
                <div className="bg-black/30 rounded-lg p-4 font-mono text-sm space-y-2 max-h-[300px] overflow-y-auto">
                  {collaborationLog.map((log, i) => (
                    <div key={i} className="text-dark-300">{log}</div>
                  ))}
                  {!collaborationResult && (
                    <div className="text-primary-400 animate-pulse mt-2">Working...</div>
                  )}
                </div>

                {/* Results */}
                {collaborationResult && (
                  <div className="mt-6 space-y-4">
                    <h4 className="font-semibold text-primary-400">Results:</h4>
                    {collaborationResult.results.map((res: any, idx: number) => {
                      const agent = agents.find(a => a.id === res.agentId)
                      return (
                        <div key={idx} className="bg-dark-700/50 p-4 rounded-lg border border-dark-600">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{agent?.avatar || '🤖'}</span>
                            <span className="font-semibold">{agent?.name || 'Agent'}</span>
                          </div>
                          <div className="text-dark-200 whitespace-pre-wrap">{res.result}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {collaborationResult && (
                <div className="flex justify-end">
                  <button
                    onClick={() => { setIsCollaborating(false); setCollaborationMode(false); }}
                    className="px-6 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Normal View */}
              {/* Collaboration Mode Input */}
              {collaborationMode && (
                <div className="p-4 bg-dark-750 border-b border-dark-700 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-sm text-dark-400 mb-1 block">
                        {t('agents.collaborationTask', 'Collaboration Task')}
                      </label>
                      <input
                        type="text"
                        value={collaborationTask}
                        onChange={(e) => setCollaborationTask(e.target.value)}
                        placeholder="Enter a task for agents to work on together..."
                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <button
                      onClick={startCollaboration}
                      disabled={selectedAgents.length < 2 || !collaborationTask}
                      className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-dark-600 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Zap size={18} />
                      {t('agents.startCollab', 'Start')} ({selectedAgents.length})
                    </button>
                  </div>
                  <p className="text-xs text-dark-500 mt-2">
                    {t('agents.selectAgents', 'Select 2 or more agents to collaborate on a task')}
                  </p>
                </div>
              )}

              {/* Agents List */}
              {activeTab === 'list' ? (
                <div className="p-6 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    {agents.map((agent) => (
                      <div
                        key={agent.id}
                        className={`relative bg-dark-750 rounded-xl p-4 border-2 transition-all cursor-pointer hover:border-primary-500 ${currentAgentId === agent.id ? 'border-primary-500' : 'border-transparent'
                          } ${collaborationMode && selectedAgents.includes(agent.id) ? 'ring-2 ring-green-500' : ''}`}
                        onClick={() => collaborationMode ? toggleAgentSelection(agent.id) : onSelectAgent(agent.id)}
                      >
                        {/* Metrics Badge */}
                        <div className="absolute top-2 right-2 flex gap-1">
                          <span className="text-[10px] bg-dark-600 px-1.5 py-0.5 rounded text-dark-300">
                            {agentMetrics.find(m => m.id === agent.id)?.tasksCompleted || 0} tasks
                          </span>
                        </div>

                        <div className="flex items-start gap-4">
                          <div
                            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                            style={{ backgroundColor: agent.color + '30' }}
                          >
                            {agent.avatar}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{agent.name}</h3>
                              {agent.isActive && (
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs bg-dark-600 px-1.5 py-0.5 rounded text-primary-400 font-mono">
                                Lvl {agentProfiles[agent.id] ? calculateLevel(agentProfiles[agent.id].totalXP) : 'Unknown'}
                              </span>
                              {agentProfiles[agent.id]?.achievements?.length > 0 && (
                                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Shield size={10} />
                                  {agentProfiles[agent.id].achievements.length}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-dark-400 line-clamp-1 mt-1">
                              {agent.personality}
                            </p>
                          </div>
                        </div>

                        {/* Top Skills */}
                        {
                          agentProfiles[agent.id] && (
                            <div className="mt-3 flex gap-1 flex-wrap">
                              {Object.values(agentProfiles[agent.id].skills || {})
                                .sort((a: any, b: any) => b.totalXP - a.totalXP)
                                .slice(0, 3)
                                .map((skill: any) => (
                                  <span key={skill.skillName} className="text-[10px] bg-dark-600/50 px-1.5 py-0.5 rounded text-dark-300 border border-dark-600">
                                    {skill.skillName} ({skill.level})
                                  </span>
                                ))}
                            </div>
                          )
                        }

                        {/* Actions */}
                        {!collaborationMode && (
                          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-dark-600">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingAgent(agent) }}
                              className="flex-1 py-1.5 bg-dark-600 hover:bg-dark-500 rounded-lg flex items-center justify-center gap-2 text-xs transition-colors"
                            >
                              <Edit2 size={12} />
                              {t('common.edit', 'Edit')}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteAgent(agent.id) }}
                              className="py-1.5 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Agent Performance Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    {agentMetrics.map((m: any) => (
                      <div key={m.id} className="bg-dark-750 p-4 rounded-xl border border-dark-700">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{m.name}</span>
                            <span className="text-xs text-dark-400 uppercase tracking-widest">{m.role}</span>
                          </div>
                          <div className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-dark-600 text-dark-400'}`}>
                            {m.status}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-dark-700 p-3 rounded-lg text-center">
                            <div className="text-xl font-bold text-primary-400">{m.tasksCompleted}</div>
                            <div className="text-[10px] text-dark-400 uppercase">Tasks Completed</div>
                          </div>
                          <div className="bg-dark-700 p-3 rounded-lg text-center">
                            <div className="text-xl font-bold text-green-400">{Math.round(m.successRate * 100)}%</div>
                            <div className="text-[10px] text-dark-400 uppercase">Success Rate</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Collaboration Graph Placeholder/Visual */}
                  <div className="bg-dark-750 p-6 rounded-xl border border-dark-700">
                    <h3 className="text-sm font-semibold mb-6 flex items-center gap-2 text-dark-100 uppercase tracking-wider">
                      <Users size={16} className="text-primary-400" />
                      Inter-Agent Collaboration Network
                    </h3>
                    <div className="relative h-64 bg-black/20 rounded-lg overflow-hidden border border-dark-600 flex items-center justify-center">
                      {/* Simple SVG Graph Representation */}
                      <svg width="100%" height="250" className="opacity-80">
                        {/* Links */}
                        {collaborationGraph.links.map((link: any, i: number) => {
                          const sourceNode = collaborationGraph.nodes.findIndex((n: any) => n.id === link.source)
                          const targetNode = collaborationGraph.nodes.findIndex((n: any) => n.id === link.target)
                          if (sourceNode === -1 || targetNode === -1) return null

                          // Circular layout positions
                          const angleS = (sourceNode / collaborationGraph.nodes.length) * Math.PI * 2
                          const angleT = (targetNode / collaborationGraph.nodes.length) * Math.PI * 2
                          const x1 = 150 * Math.cos(angleS) + 400
                          const y1 = 100 * Math.sin(angleS) + 125
                          const x2 = 150 * Math.cos(angleT) + 400
                          const y2 = 100 * Math.sin(angleT) + 125

                          return (
                            <line
                              key={i}
                              x1={x1} y1={y1} x2={x2} y2={y2}
                              stroke="currentColor"
                              strokeWidth={Math.min(5, link.value)}
                              strokeOpacity="0.2"
                              className="text-primary-500"
                            />
                          )
                        })}
                        {/* Nodes */}
                        {collaborationGraph.nodes.map((node: any, i: number) => {
                          const angle = (i / collaborationGraph.nodes.length) * Math.PI * 2
                          const x = 150 * Math.cos(angle) + 400
                          const y = 100 * Math.sin(angle) + 125

                          return (
                            <g key={node.id}>
                              <circle
                                cx={x} cy={y} r="12"
                                className="fill-dark-700 stroke-primary-500"
                                strokeWidth="2"
                              />
                              <text
                                x={x} y={y + 25}
                                textAnchor="middle"
                                className="fill-dark-300 text-[10px] font-bold"
                              >
                                {node.label}
                              </text>
                            </g>
                          )
                        })}
                      </svg>
                      {collaborationGraph.nodes.length === 0 && (
                        <div className="text-dark-500 text-sm italic">Aggregate collaboration history to visualize neural patterns</div>
                      )}
                    </div>
                  </div>

                  {/* Collaboration History Timeline */}
                  <div className="bg-dark-750 p-6 rounded-xl border border-dark-700">
                    <h3 className="text-sm font-semibold mb-6 flex items-center gap-2 text-dark-100 uppercase tracking-wider">
                      <HistoryIcon size={16} className="text-green-400" />
                      Collaboration Timeline
                    </h3>
                    <div className="space-y-4">
                      {collaborationHistory.map((item) => (
                        <div key={item.id} className="relative pl-6 border-l-2 border-dark-600 pb-4 last:pb-0">
                          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-dark-700 border-2 border-primary-500" />
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium">{item.task}</span>
                            <span className="text-[10px] text-dark-500">{new Date(item.time).toLocaleTimeString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-1.5">
                              {item.participants.map((p: string) => (
                                <div key={p} className="w-5 h-5 rounded-full bg-dark-600 border border-dark-800 flex items-center justify-center text-[10px]" title={p}>
                                  {p[0]}
                                </div>
                              ))}
                            </div>
                            <span className="text-[10px] text-dark-400">Collaborated by {item.participants.join(' & ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Edit Agent Modal */}
          {editingAgent && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
              <div className="bg-dark-800 rounded-2xl w-[600px] max-h-[80vh] overflow-y-auto shadow-2xl">
                <div className="p-6 border-b border-dark-700">
                  <h3 className="text-xl font-bold">
                    {isCreating ? t('agents.createAgent', 'Create Agent') : t('agents.editAgent', 'Edit Agent')}
                  </h3>
                </div>

                <div className="p-6 space-y-4">
                  {/* Avatar & Color */}
                  <div className="flex gap-6">
                    <div>
                      <label className="text-sm text-dark-400 mb-2 block">{t('agents.avatar', 'Avatar')}</label>
                      <div className="flex flex-wrap gap-2 max-w-[200px]">
                        {AVATAR_OPTIONS.map((avatar) => (
                          <button
                            key={avatar}
                            onClick={() => setEditingAgent({ ...editingAgent, avatar })}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${editingAgent.avatar === avatar
                              ? 'bg-primary-600 ring-2 ring-primary-400'
                              : 'bg-dark-700 hover:bg-dark-600'
                              }`}
                          >
                            {avatar}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-dark-400 mb-2 block">{t('agents.color', 'Color')}</label>
                      <div className="flex flex-wrap gap-2">
                        {COLOR_OPTIONS.map((color) => (
                          <button
                            key={color}
                            onClick={() => setEditingAgent({ ...editingAgent, color })}
                            className={`w-10 h-10 rounded-lg transition-all ${editingAgent.color === color ? 'ring-2 ring-white' : ''
                              }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="text-sm text-dark-400 mb-2 block">{t('agents.name', 'Name')}</label>
                    <input
                      type="text"
                      value={editingAgent.name}
                      onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Personality */}
                  <div>
                    <label className="text-sm text-dark-400 mb-2 block">{t('agents.personality', 'Personality')}</label>
                    <textarea
                      value={editingAgent.personality}
                      onChange={(e) => setEditingAgent({ ...editingAgent, personality: e.target.value })}
                      rows={2}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                  </div>

                  {/* System Prompt */}
                  <div>
                    <label className="text-sm text-dark-400 mb-2 block">{t('agents.systemPrompt', 'System Prompt')}</label>
                    <textarea
                      value={editingAgent.systemPrompt}
                      onChange={(e) => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })}
                      rows={4}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none font-mono text-sm"
                    />
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-dark-400">{t('agents.active', 'Active')}</label>
                    <button
                      onClick={() => setEditingAgent({ ...editingAgent, isActive: !editingAgent.isActive })}
                      className={`w-12 h-6 rounded-full transition-colors ${editingAgent.isActive ? 'bg-green-500' : 'bg-dark-600'
                        }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${editingAgent.isActive ? 'translate-x-6' : 'translate-x-0.5'
                        }`} />
                    </button>
                  </div>
                </div>

                <div className="p-6 border-t border-dark-700 flex justify-end gap-3">
                  <button
                    onClick={() => { setEditingAgent(null); setIsCreating(false) }}
                    className="px-6 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={() => saveAgent(editingAgent)}
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors"
                  >
                    {t('common.save', 'Save')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Agent Creator Modal */}
          <AgentCreatorModal
            isOpen={isCreatorModalOpen}
            onClose={() => setIsCreatorModalOpen(false)}
            onAgentCreated={handleAgentCreated}
          />
        </div>
      </div>
    </div >
  )
}

export default AgentsPanel

