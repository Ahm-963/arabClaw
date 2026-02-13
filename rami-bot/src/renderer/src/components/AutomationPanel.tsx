import { useState, useEffect } from 'react'
import {
    Clock,
    Play,
    Pause,
    Trash2,
    Plus,
    X,
    Settings,
    Zap,
    Calendar,
    History,
    CheckCircle,
    AlertCircle,
    MoreVertical,
    ChevronRight,
    RefreshCw,
    Layout,
    Star
} from 'lucide-react'

interface AutomationPanelProps {
    isOpen: boolean
    onClose: () => void
}

interface CronTask {
    id: string
    name: string
    schedule?: string
    timestamp?: number
    type: 'recurring' | 'one-time'
    command: string
    enabled: boolean
    lastRun?: number
    lastResult?: string
}

interface Workflow {
    id: string
    name: string
    description: string
    trigger: any
    steps: any[]
    enabled: boolean
    runCount: number
    successCount: number
}

export default function AutomationPanel({ isOpen, onClose }: AutomationPanelProps) {
    const [activeTab, setActiveTab] = useState<'cron' | 'workflows'>('cron')
    const [cronTasks, setCronTasks] = useState<CronTask[]>([])
    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [templates, setTemplates] = useState<Workflow[]>([])
    const [loading, setLoading] = useState(false)
    const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false)
    const [isCreateWorkflowModalOpen, setIsCreateWorkflowModalOpen] = useState(false)

    const [newTask, setNewTask] = useState({
        name: '',
        type: 'recurring' as 'recurring' | 'one-time',
        schedule: '* * * * *',
        timestamp: '',
        command: ''
    })

    useEffect(() => {
        if (isOpen) {
            loadData()
        }
    }, [isOpen, activeTab])

    const loadData = async () => {
        setLoading(true)
        try {
            if (activeTab === 'cron') {
                const result = await (window as any).electron.cronList()
                if (result.success) setCronTasks(result.tasks)
            } else {
                const wfResult = await (window as any).electron.workflowList()
                if (wfResult.success) setWorkflows(wfResult.workflows)

                const tempResult = await (window as any).electron.workflowTemplates()
                if (tempResult.success) setTemplates(tempResult.templates)
            }
        } catch (error) {
            console.error('Failed to load automation data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleToggleCron = async (id: string, enabled: boolean) => {
        try {
            const result = await (window as any).electron.cronToggle(id, enabled)
            if (result.success) {
                setCronTasks(prev => prev.map(t => t.id === id ? { ...t, enabled } : t))
            }
        } catch (error) {
            console.error('Failed to toggle cron task:', error)
        }
    }

    const handleDeleteCron = async (id: string) => {
        if (!confirm('Are you sure you want to delete this scheduled task?')) return
        try {
            const result = await (window as any).electron.cronDelete(id)
            if (result.success) {
                setCronTasks(prev => prev.filter(t => t.id !== id))
            }
        } catch (error) {
            console.error('Failed to delete cron task:', error)
        }
    }

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const ts = newTask.type === 'one-time' ? new Date(newTask.timestamp).getTime() : undefined
            const result = await (window as any).electron.cronCreate(
                newTask.name,
                newTask.type,
                newTask.type === 'recurring' ? newTask.schedule : undefined,
                ts,
                newTask.command
            )
            if (result.success) {
                setCronTasks(prev => [...prev, result.task])
                setIsCreateTaskModalOpen(false)
                setNewTask({ name: '', type: 'recurring', schedule: '* * * * *', timestamp: '', command: '' })
            }
        } catch (error) {
            console.error('Failed to create cron task:', error)
        }
    }

    const handleRunWorkflow = async (id: string) => {
        try {
            const result = await (window as any).electron.workflowRun(id)
            if (result.success) {
                alert('Workflow started successfully!')
                loadData()
            }
        } catch (error) {
            console.error('Failed to run workflow:', error)
        }
    }

    const handleActivateTemplate = async (template: Workflow) => {
        try {
            const result = await (window as any).electron.workflowCreate({
                ...template,
                enabled: true
            })
            if (result.success) {
                setWorkflows(prev => [...prev, result.workflow])
                setIsCreateWorkflowModalOpen(false)
            }
        } catch (error) {
            console.error('Failed to activate template:', error)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Clock className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Automation Engine</h1>
                            <p className="text-sm text-slate-400">Manage schedules and workflows</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadData}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                            title="Refresh"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex px-6 border-b border-slate-800 bg-slate-900/30">
                    <button
                        onClick={() => setActiveTab('cron')}
                        className={`px-6 py-4 text-sm font-medium transition-all relative ${activeTab === 'cron' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        Scheduled Tasks
                        {activeTab === 'cron' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('workflows')}
                        className={`px-6 py-4 text-sm font-medium transition-all relative ${activeTab === 'workflows' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        Automated Workflows
                        {activeTab === 'workflows' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />}
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-white">
                            {activeTab === 'cron' ? 'Managed Schedules' : 'Active Workflows'}
                        </h2>
                        <button
                            onClick={() => activeTab === 'cron' ? setIsCreateTaskModalOpen(true) : setIsCreateWorkflowModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-blue-500/20"
                        >
                            <Plus size={16} />
                            Create {activeTab === 'cron' ? 'Task' : 'Workflow'}
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                            <RefreshCw className="w-8 h-8 animate-spin" />
                            <p>Fetching automation state...</p>
                        </div>
                    ) : activeTab === 'cron' ? (
                        cronTasks.length > 0 ? (
                            <div className="grid gap-4">
                                {cronTasks.map(task => (
                                    <div key={task.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group hover:border-slate-600 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-full ${task.enabled ? 'bg-green-500/10' : 'bg-slate-700/20'}`}>
                                                {task.enabled ? (
                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                ) : (
                                                    <div className="w-2 h-2 bg-slate-500 rounded-full" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-medium text-white">{task.name}</h3>
                                                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${task.type === 'recurring' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                                                        }`}>
                                                        {task.type}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    {task.type === 'recurring' ? (
                                                        <span className="text-xs font-mono text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded border border-slate-700">
                                                            {task.schedule}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                                            <Calendar size={12} />
                                                            {task.timestamp ? new Date(task.timestamp).toLocaleString() : 'Not set'}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                        <History size={12} />
                                                        Last run: {task.lastRun ? new Date(task.lastRun).toLocaleString() : 'Never'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleToggleCron(task.id, !task.enabled)}
                                                className={`p-2 rounded-lg transition-colors ${task.enabled ? 'text-green-400 hover:bg-green-500/10' : 'text-slate-400 hover:bg-slate-700/50'
                                                    }`}
                                                title={task.enabled ? 'Pause' : 'Resume'}
                                            >
                                                {task.enabled ? <Pause size={18} /> : <Play size={18} />}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCron(task.id)}
                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                                <Calendar className="w-12 h-12 mb-4 opacity-20" />
                                <p>No scheduled tasks found.</p>
                                <p className="text-sm">Create your first cron job or one-time event.</p>
                            </div>
                        )
                    ) : (
                        <div className="grid gap-6">
                            {workflows.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {workflows.map(wf => (
                                        <div key={wf.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 hover:border-blue-500/50 transition-all group relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-blue-500/10 rounded-xl">
                                                    <Zap size={20} className="text-blue-400" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500">{wf.runCount} runs</span>
                                                    <button onClick={() => handleRunWorkflow(wf.id)} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-all shadow-lg shadow-blue-500/20">
                                                        <Play size={14} fill="currentColor" />
                                                    </button>
                                                </div>
                                            </div>
                                            <h3 className="text-lg font-bold mb-1 text-white">{wf.name}</h3>
                                            <p className="text-sm text-slate-400 line-clamp-2 h-10 mb-4">{wf.description}</p>

                                            <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-700/50 pt-4">
                                                <span className="flex items-center gap-1"><Layout size={12} /> {wf.steps.length} Steps</span>
                                                <span className="flex items-center gap-1 text-green-400"><CheckCircle size={12} /> {wf.successCount} Success</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                                    <Layout className="w-12 h-12 mb-4 opacity-20" />
                                    <p>No active workflows.</p>
                                    <p className="text-sm">Click "Create Workflow" to activate a template.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="p-4 bg-slate-900/50 border-t border-slate-800 px-6 flex justify-between items-center text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <CheckCircle size={12} className="text-green-500" />
                            Engine Online
                        </span>
                        <span className="flex items-center gap-1 opacity-60">
                            <History size={12} />
                            Sync: OK
                        </span>
                    </div>
                    <p className="font-mono">Rami Bot 1.0 - Automation Stack</p>
                </div>
            </div>

            {/* Create Task Modal Overlay */}
            {isCreateTaskModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setIsCreateTaskModalOpen(false)}>
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">New Scheduled Task</h3>
                            <button onClick={() => setIsCreateTaskModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-tight">Name Your Task</label>
                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    placeholder="e.g., Morning Briefing"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    value={newTask.name}
                                    onChange={e => setNewTask({ ...newTask, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-tight">Schedule Type</label>
                                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setNewTask({ ...newTask, type: 'recurring' })}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${newTask.type === 'recurring' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        Recurring
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewTask({ ...newTask, type: 'one-time' })}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${newTask.type === 'one-time' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        Once
                                    </button>
                                </div>
                            </div>

                            {newTask.type === 'recurring' ? (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-tight">Cron Schedule (Min Hr Day Mon DayOfW)</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="* * * * *"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        value={newTask.schedule}
                                        onChange={e => setNewTask({ ...newTask, schedule: e.target.value })}
                                    />
                                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                        {['* * * * *', '0 * * * *', '0 0 * * *', '0 0 * * 1'].map(preset => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setNewTask({ ...newTask, schedule: preset })}
                                                className="text-[10px] bg-slate-700/50 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-600 whitespace-nowrap transition-colors"
                                            >
                                                {preset === '* * * * *' ? 'Every Min' : preset === '0 * * * *' ? 'Every Hour' : preset === '0 0 * * *' ? 'Every Day' : 'Every Mon'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-tight">Pick Date & Time</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all [color-scheme:dark]"
                                        value={newTask.timestamp}
                                        onChange={e => setNewTask({ ...newTask, timestamp: e.target.value })}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-tight">Shell Command</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="echo 'Trigger workflow #1'..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                                    value={newTask.command}
                                    onChange={e => setNewTask({ ...newTask, command: e.target.value })}
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 mt-4 transition-all active:scale-[0.98]"
                            >
                                Activate Schedule
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Workflow Template Selector */}
            {isCreateWorkflowModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setIsCreateWorkflowModalOpen(false)}>
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-3xl w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-white">Workflow Templates</h3>
                                <p className="text-sm text-slate-400">Select a blueprint to activate</p>
                            </div>
                            <button onClick={() => setIsCreateWorkflowModalOpen(false)} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
                            {templates.map(temp => (
                                <div key={temp.id} className="bg-slate-900 border border-slate-700 rounded-2xl p-5 hover:border-blue-500/50 transition-all group flex flex-col h-full">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-yellow-500/10 rounded-lg">
                                            <Star size={18} className="text-yellow-500" />
                                        </div>
                                        <h4 className="font-bold text-white">{temp.name}</h4>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-6 flex-1">{temp.description}</p>
                                    <button
                                        onClick={() => handleActivateTemplate(temp)}
                                        className="w-full py-2.5 bg-slate-800 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 text-sm font-semibold rounded-xl transition-all"
                                    >
                                        Activate Blueprint
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
