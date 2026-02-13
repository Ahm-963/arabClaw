import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Brain, Lightbulb, Heart, Trash2, Search, RefreshCw,
  X, ChevronDown, ChevronRight, Tag, Clock, TrendingUp,
  BookOpen, Sparkles, Target, CheckCircle, AlertCircle, Upload,
  Cpu,
  FileText, Activity
} from 'lucide-react'

interface Memory {
  id: string
  type: 'fact' | 'preference' | 'learning' | 'pattern' | 'correction' | 'skill'
  category: string
  content: string
  confidence: number
  useCount: number
  successRate: number
  createdAt: number
  updatedAt: number
  tags: string[]
}

interface LearningStats {
  totalMemories: number
  totalPreferences: number
  totalPatterns: number
  totalTaskLearnings: number
  totalReflections: number
  memoryByType: Record<string, number>
  successRate: number
}

interface LearningPanelProps {
  isOpen: boolean
  onClose: () => void
}

function LearningPanel({ isOpen, onClose }: LearningPanelProps) {
  const { t } = useTranslation()
  const [memories, setMemories] = useState<Memory[]>([])
  const [stats, setStats] = useState<LearningStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['all']))
  const [teachInput, setTeachInput] = useState('')
  const [isTeaching, setIsTeaching] = useState(false)
  const [activeTab, setActiveTab] = useState<'memories' | 'analytics'>('memories')
  const [analytics, setAnalytics] = useState<any>(null)
  const [skillStats, setSkillStats] = useState<any>(null)
  const [vectorStats, setVectorStats] = useState<any>(null)
  const [ingestionQueue, setIngestionQueue] = useState<any[]>([])

  useEffect(() => {
    if (isOpen) {
      loadData()
      if (activeTab === 'analytics') {
        loadAnalytics()
      }
    }
  }, [isOpen, activeTab])

  const loadData = async () => {
    try {
      const statsResult = await window.electron?.getLearningStats()
      if (statsResult) setStats(statsResult)

      const memoriesResult = await window.electron?.recallMemories('')
      if (memoriesResult) setMemories(memoriesResult)
    } catch (e) {
      console.error('Failed to load learning data:', e)
    }
  }

  const loadAnalytics = async () => {
    try {
      const analyticsResult = await window.electron.getAnalytics()
      setAnalytics(analyticsResult)

      const vStats = await window.electron.getVectorStats()
      setVectorStats(vStats)

      const sStats = await window.electron.getGlobalStats()
      setSkillStats(sStats)

      // Mock or fetch ingestion queue
      setIngestionQueue([
        { id: '1', name: 'technical_manual.pdf', status: 'completed', progress: 100 },
        { id: '2', name: 'api_docs.md', status: 'processing', progress: 65 },
        { id: '3', name: 'company_policy.json', status: 'queued', progress: 0 }
      ])
    } catch (error) {
      console.error('Failed to load analytics:', error)
    }
  }

  const handleSearch = async () => {
    try {
      const results = await window.electron?.recallMemories(searchQuery, {
        type: selectedType !== 'all' ? selectedType : undefined
      })
      if (results) setMemories(results)
    } catch (e) { }
  }

  const handleTeach = async () => {
    if (!teachInput.trim()) return
    setIsTeaching(true)
    console.log('[LearningPanel] Teaching fact:', teachInput)
    try {
      if (!window.electron?.teachFact) {
        throw new Error('IPC teachFact not available')
      }
      const result = await window.electron.teachFact(teachInput)
      console.log('[LearningPanel] Teach result:', result)
      setTeachInput('')
      loadData()
    } catch (e: any) {
      console.error('[LearningPanel] Failed to teach:', e)
      alert(`Failed to teach: ${e.message || e}`)
    } finally {
      setIsTeaching(false)
    }
  }

  const handleForget = async (memory: Memory) => {
    if (!confirm(`Are you sure you want to forget: "${memory.content.substring(0, 50)}..."?`)) return
    try {
      await window.electron?.forgetMemory(memory.id)
      loadData()
    } catch (e) { }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fact': return <BookOpen size={16} className="text-blue-400" />
      case 'preference': return <Heart size={16} className="text-pink-400" />
      case 'learning': return <Lightbulb size={16} className="text-yellow-400" />
      case 'pattern': return <Target size={16} className="text-purple-400" />
      case 'correction': return <AlertCircle size={16} className="text-orange-400" />
      case 'skill': return <Sparkles size={16} className="text-green-400" />
      default: return <Brain size={16} className="text-gray-400" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'fact': return 'bg-blue-500/20 text-blue-400'
      case 'preference': return 'bg-pink-500/20 text-pink-400'
      case 'learning': return 'bg-yellow-500/20 text-yellow-400'
      case 'pattern': return 'bg-purple-500/20 text-purple-400'
      case 'correction': return 'bg-orange-500/20 text-orange-400'
      case 'skill': return 'bg-green-500/20 text-green-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const groupedMemories = memories.reduce((acc, mem) => {
    const cat = mem.category || 'general'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(mem)
    return acc
  }, {} as Record<string, Memory[]>)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-2xl w-[900px] max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Brain size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t('learning.title', 'Learning & Memory')}</h2>
              <div className="flex gap-4 mt-1">
                <button
                  onClick={() => setActiveTab('memories')}
                  className={`text-sm ${activeTab === 'memories' ? 'text-primary-400 font-bold border-b-2 border-primary-400' : 'text-dark-400 hover:text-dark-200'}`}
                >
                  {t('learning.memoriesTab', 'Memories')}
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`text-sm ${activeTab === 'analytics' ? 'text-primary-400 font-bold border-b-2 border-primary-400' : 'text-dark-400 hover:text-dark-200'}`}
                >
                  {t('learning.analyticsTab', 'Analytics')}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => activeTab === 'memories' ? loadData() : loadAnalytics()}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={20} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'memories' ? (
            <>

              {/* Stats Bar */}
              {stats && (
                <div className="p-4 bg-dark-750 border-b border-dark-700">
                  <div className="grid grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{stats.totalMemories}</div>
                      <div className="text-xs text-dark-400">{t('learning.memories', 'Memories')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-pink-400">{stats.totalPreferences}</div>
                      <div className="text-xs text-dark-400">{t('learning.preferences', 'Preferences')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{stats.totalPatterns}</div>
                      <div className="text-xs text-dark-400">{t('learning.patterns', 'Patterns')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">{stats.totalTaskLearnings}</div>
                      <div className="text-xs text-dark-400">{t('learning.tasks', 'Task Learnings')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{stats.successRate}%</div>
                      <div className="text-xs text-dark-400">{t('learning.successRate', 'Success Rate')}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Teach Section */}
              <div className="p-4 border-b border-dark-700">
                <label className="text-sm text-dark-400 mb-2 block">
                  {t('learning.teachMe', 'Teach me something new')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={teachInput}
                    onChange={(e) => setTeachInput(e.target.value)}
                    placeholder={t('learning.teachPlaceholder', 'e.g., "My favorite color is blue" or "Remember: meeting at 3pm"')}
                    className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleTeach()}
                  />
                  <button
                    onClick={handleTeach}
                    disabled={!teachInput.trim() || isTeaching}
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-dark-600 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Sparkles size={18} />
                    {t('learning.teach', 'Teach')}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const result = await window.electron?.showOpenDialog({
                          filters: [{ name: 'Documents', extensions: ['pdf', 'txt', 'md', 'json'] }]
                        })
                        if (result?.filePaths?.[0]) {
                          setIsTeaching(true)
                          try {
                            const ingestResult = await window.electron?.ingestDocument(result.filePaths[0])
                            if (ingestResult?.success) {
                              alert(`Successfully learned ${ingestResult.learnedCount} items from document!`)
                              loadData()
                            } else {
                              alert('Failed to learn from document: ' + ingestResult?.error)
                            }
                          } finally {
                            setIsTeaching(false)
                          }
                        }
                      } catch (e) {
                        console.error('Upload failed:', e)
                      }
                    }}
                    disabled={isTeaching}
                    className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg flex items-center gap-2 transition-colors"
                    title="Upload PDF/Document"
                  >
                    <Upload size={18} />
                    <span className="hidden sm:inline">Upload</span>
                  </button>
                </div>
              </div>

              {/* Search & Filter */}
              <div className="p-4 border-b border-dark-700 flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={t('learning.searchMemories', 'Search memories...')}
                    className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">{t('learning.allTypes', 'All Types')}</option>
                  <option value="fact">{t('learning.facts', 'Facts')}</option>
                  <option value="preference">{t('learning.preferencesType', 'Preferences')}</option>
                  <option value="learning">{t('learning.learnings', 'Learnings')}</option>
                  <option value="pattern">{t('learning.patternsType', 'Patterns')}</option>
                  <option value="correction">{t('learning.corrections', 'Corrections')}</option>
                </select>
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
                >
                  <Search size={18} />
                </button>
              </div>

              {/* Memories List */}
              <div className="flex-1 overflow-y-auto p-4">
                {Object.keys(groupedMemories).length === 0 ? (
                  <div className="text-center py-12 text-dark-500">
                    <Brain size={48} className="mx-auto mb-4 opacity-50" />
                    <p>{t('learning.noMemories', 'No memories yet. Start chatting to build memories!')}</p>
                  </div>
                ) : (
                  Object.entries(groupedMemories).map(([category, categoryMemories]) => (
                    <div key={category} className="mb-4">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedCategories)
                          if (newExpanded.has(category)) {
                            newExpanded.delete(category)
                          } else {
                            newExpanded.add(category)
                          }
                          setExpandedCategories(newExpanded)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-dark-750 rounded-lg hover:bg-dark-700 transition-colors"
                      >
                        {expandedCategories.has(category) ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                        <span className="font-medium capitalize">{category.replace(/_/g, ' ')}</span>
                        <span className="text-xs bg-dark-600 px-2 py-0.5 rounded-full ml-auto">
                          {categoryMemories.length}
                        </span>
                      </button>

                      {expandedCategories.has(category) && (
                        <div className="mt-2 space-y-2 pl-4">
                          {categoryMemories.map((memory) => (
                            <div
                              key={memory.id}
                              className="bg-dark-750 rounded-lg p-4 border border-dark-600 hover:border-dark-500 transition-all"
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-1">{getTypeIcon(memory.type)}</div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-dark-200">{memory.content}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(memory.type)}`}>
                                      {memory.type}
                                    </span>
                                    <span className="text-xs text-dark-500 flex items-center gap-1">
                                      <TrendingUp size={12} />
                                      {Math.round(memory.confidence * 100)}% confidence
                                    </span>
                                    <span className="text-xs text-dark-500 flex items-center gap-1">
                                      <Clock size={12} />
                                      {formatDate(memory.createdAt)}
                                    </span>
                                    {memory.useCount > 0 && (
                                      <span className="text-xs text-dark-500">
                                        Used {memory.useCount}x
                                      </span>
                                    )}
                                  </div>
                                  {memory.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {memory.tags.map((tag) => (
                                        <span
                                          key={tag}
                                          className="text-xs px-2 py-0.5 bg-dark-600 rounded-full flex items-center gap-1"
                                        >
                                          <Tag size={10} />
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleForget(memory)}
                                  className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                  title="Forget this memory"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-dark-750 p-4 rounded-xl border border-dark-700">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-dark-100">
                    <Tag size={16} className="text-primary-400" />
                    Memory Distribution
                  </h3>
                  <div className="space-y-3">
                    {analytics?.distribution?.map((item: any) => (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between text-xs text-dark-300">
                          <span>{item.name}</span>
                          <span>{item.value} ({Math.round((item.value / analytics.totalMemories) * 100)}%)</span>
                        </div>
                        <div className="w-full bg-dark-600 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${(item.value / analytics.totalMemories) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skill Analytics */}
                <div className="bg-dark-750 p-4 rounded-xl border border-dark-700">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-dark-100">
                    <Sparkles size={16} className="text-yellow-400" />
                    Swarm Skill Distribution
                  </h3>
                  <div className="space-y-3">
                    {skillStats?.skillDistribution && Object.entries(skillStats.skillDistribution).map(([level, count]: [string, any]) => (
                      <div key={level} className="space-y-1">
                        <div className="flex justify-between text-xs text-dark-300 capitalize">
                          <span>{level}</span>
                          <span>{count}</span>
                        </div>
                        <div className="w-full bg-dark-600 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-yellow-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${(count / (skillStats.totalSkillsLearned || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {!skillStats && <div className="text-dark-500 text-xs">No skill data available</div>}
                  </div>
                </div>

                <div className="bg-dark-750 p-4 rounded-xl border border-dark-700">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-dark-100">
                    <TrendingUp size={16} className="text-green-400" />
                    Ingestion Rate (Last 7 Days)
                  </h3>
                  <div className="flex items-end justify-between h-32 gap-1 pt-4">
                    {analytics?.ingestionChart?.map((day: any, i: number) => (
                      <div key={i} className="flex-1 group relative flex flex-col items-center">
                        <div
                          className="w-full bg-primary-600/40 group-hover:bg-primary-500 transition-all rounded-t-sm"
                          style={{ height: `${Math.max(10, (day.count / (Math.max(...analytics.ingestionChart.map((d: any) => d.count)) || 1)) * 100)}%` }}
                        >
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-dark-900 border border-dark-600 px-1.5 py-0.5 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {day.count}
                          </div>
                        </div>
                        <div className="text-[10px] text-dark-500 mt-2 rotate-45 origin-left truncate w-8">
                          {day.date}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-dark-750 p-4 rounded-xl border border-dark-700 col-span-2">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-dark-100">
                    <Cpu size={16} className="text-blue-400" />
                    Vector Engine Health
                  </h3>
                  <div className="grid grid-cols-3 gap-8">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-500/10 p-3 rounded-lg text-blue-400">
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-dark-100">{vectorStats?.totalVectors || 0}</div>
                        <div className="text-xs text-dark-400 uppercase tracking-wider">Embeddings</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="bg-green-500/10 p-3 rounded-lg text-green-400">
                        <Target size={24} />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-dark-100">
                          {vectorStats?.approximateSizeBase64 ? Math.round(vectorStats.approximateSizeBase64 / 1024) : 0} KB
                        </div>
                        <div className="text-xs text-dark-400 uppercase tracking-wider">Engine Size</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="bg-orange-500/10 p-3 rounded-lg text-orange-400">
                        <AlertCircle size={24} />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-dark-100">{analytics?.piiDetections || 0}</div>
                        <div className="text-xs text-dark-400 uppercase tracking-wider">PII Redacted</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-dark-750 p-4 rounded-xl border border-dark-700 col-span-2">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-dark-100 uppercase tracking-widest">
                  <Activity size={16} className="text-purple-400" />
                  Ingestion Pipeline
                </h3>
                <div className="space-y-3">
                  {ingestionQueue.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 bg-dark-700/50 p-3 rounded-lg border border-dark-600">
                      <div className="bg-dark-600 p-2 rounded-lg">
                        <FileText size={18} className="text-dark-300" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className={`text-[10px] uppercase font-bold ${item.status === 'completed' ? 'text-green-400' :
                            item.status === 'processing' ? 'text-primary-400 animate-pulse' :
                              'text-dark-400'
                            }`}>
                            {item.status}
                          </span>
                        </div>
                        <div className="w-full bg-dark-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${item.status === 'completed' ? 'bg-green-500' : 'bg-primary-500'
                              }`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-700 bg-dark-750">
          <div className="flex items-center justify-between text-sm text-dark-500">
            <span>
              {t('learning.totalStored', 'Total memories stored')}: {memories.length}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle size={14} className="text-green-500" />
              {t('learning.learningActive', 'Learning is active')}
            </span>
          </div>
        </div>
      </div>
    </div >
  )
}

export default LearningPanel
