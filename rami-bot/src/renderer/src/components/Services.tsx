import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Square, Trash2, Plus, Layers, RefreshCw, Clock, Calendar, CheckCircle, XCircle, FileText, Box, Zap } from 'lucide-react'

interface Service {
  id: string
  name: string
  description: string
  type: 'longRunning' | 'scheduled'
  status: 'running' | 'stopped' | 'error'
  createdAt: number
}

interface CronTask {
  id: string
  name: string
  schedule: string
  command: string
  enabled: boolean
  lastRun?: number
  lastResult?: string
}

interface CoreStatus {
  remoteServer: boolean
  localAPI: boolean
  synergy: boolean
  workerCount: number
}

const ServiceStatusBadge = ({ active }: { active: boolean | undefined }) => (
  <div className={`px-2 py-1 rounded text-xs ${active ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'}`}>
    {active ? 'Active' : 'Inactive'}
  </div>
)

function Services() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'services' | 'cron'>('services')
  const [services, setServices] = useState<Service[]>([])
  const [cronTasks, setCronTasks] = useState<CronTask[]>([])
  const [coreStatus, setCoreStatus] = useState<CoreStatus | null>(null)
  const [loading, setLoading] = useState(true)

  // New Task Form
  const [showAddCron, setShowAddCron] = useState(false)
  const [newTask, setNewTask] = useState({ name: '', schedule: '* * * * *', command: '' })

  const loadData = async () => {
    setLoading(true)
    try {
      console.log('Loading Services data...')
      const [svc, cron, cStatus] = await Promise.all([
        window.electron.listServices().catch((e: any) => {
          console.error('listServices failed', e)
          return []
        }),
        window.electron.listCronTasks().catch((e: any) => {
          console.error('listCronTasks failed', e)
          return []
        }),
        window.electron.getCoreStatus().catch((e: any) => {
          console.error('getCoreStatus failed', e)
          return null
        })
      ])

      setServices(Array.isArray(svc) ? svc : [])

      // Handle standardized cron response (either array or object with tasks)
      if (Array.isArray(cron)) {
        setCronTasks(cron)
      } else if (cron && Array.isArray((cron as any).tasks)) {
        setCronTasks((cron as any).tasks)
      } else {
        setCronTasks([])
      }

      setCoreStatus(cStatus)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    const handleServiceStatus = ({ serviceId, status }: { serviceId: string; status: string }) => {
      setServices(prev => prev.map(s =>
        s.id === serviceId ? { ...s, status: status as Service['status'] } : s
      ))
    }

    const handleOrgStatus = ({ running }: { running: boolean }) => {
      setCoreStatus(prev => prev ? { ...prev, synergy: running } : null)
    }

    const cleanupSvc = window.electron.on('service:status', handleServiceStatus)
    const cleanupOrg = window.electron.on('org:status', handleOrgStatus)

    return () => {
      cleanupSvc()
      cleanupOrg()
    }
  }, [])

  // Core Service Handlers
  const toggleRemoteServer = async () => {
    if (coreStatus?.remoteServer) {
      await window.electron.remoteStop()
    } else {
      await window.electron.remoteStart(3000)
    }
    loadData()
  }

  const toggleSynergy = async () => {
    if (coreStatus?.synergy) {
      await window.electron.stopSynergy()
    } else {
      await window.electron.startSynergy()
    }
    loadData()
  }

  const toggleLocalAPI = async () => {
    if (coreStatus?.localAPI) {
      await window.electron.localAPIStop()
    } else {
      await window.electron.localAPIStart(31415)
    }
    loadData()
  }

  // Service Handlers
  const handleStartService = async (id: string) => {
    await window.electron.startService(id)
    loadData()
  }

  const handleStopService = async (id: string) => {
    await window.electron.stopService(id)
    loadData()
  }

  const handleDeleteService = async (id: string) => {
    if (confirm(t('services.confirmDelete'))) {
      await window.electron.deleteService(id)
      loadData()
    }
  }

  // Cron Handlers
  const handleAddCron = async () => {
    if (!newTask.name || !newTask.schedule || !newTask.command) return
    try {
      await window.electron.createCronTask(newTask)
      setShowAddCron(false)
      setNewTask({ name: '', schedule: '* * * * *', command: '' })
      loadData()
    } catch (e) {
      console.error('Failed to create cron task', e)
    }
  }

  const handleDeleteCron = async (id: string) => {
    if (confirm('Delete this scheduled task?')) {
      await window.electron.deleteCronTask(id)
      loadData()
    }
  }

  const handleToggleCron = async (id: string, enabled: boolean) => {
    await window.electron.toggleCronTask(id, enabled)
    loadData()
  }

  // System Stats (mocked for now or fetched via synergy status which includes system info if we add it)
  // But we have openLogs in preload.

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-dark-900">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full" />
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-purple-600 flex items-center justify-center shadow-xl relative z-10">
                <Box size={32} className="text-white drop-shadow-lg" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">{t('services.title')}</h1>
              <p className="text-dark-400 text-sm font-medium mt-1">Monitor and manage your background ecosystem</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.electron.openLogs()}
              className="px-4 py-2.5 bg-dark-800 hover:bg-dark-700 rounded-xl transition-colors border border-dark-700 text-dark-300 hover:text-dark-100 text-sm font-medium flex items-center gap-2"
              title="Open Logs"
            >
              <FileText size={18} />
              View Logs
            </button>
            <button
              onClick={loadData}
              className="p-2.5 bg-dark-800 hover:bg-dark-700 rounded-xl transition-colors border border-dark-700"
              title="Refresh"
            >
              <RefreshCw size={20} className={`text-dark-300 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-dark-700 pb-1">
          <button
            onClick={() => setActiveTab('services')}
            className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === 'services' ? 'text-primary-400' : 'text-dark-400 hover:text-dark-200'
              }`}
          >
            Background Services
            {activeTab === 'services' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('cron')}
            className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === 'cron' ? 'text-primary-400' : 'text-dark-400 hover:text-dark-200'
              }`}
          >
            Scheduled Tasks (Cron)
            {activeTab === 'cron' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Content */}
        {activeTab === 'services' ? (
          <div className="space-y-4">
            {/* Core Services Status */}
            <div className="bg-dark-800 rounded-xl p-5 border border-dark-700 mb-6">
              <h3 className="font-semibold text-dark-100 mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-primary-500" />
                Core System Services
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-dark-900/50 p-4 rounded-lg flex items-center justify-between border border-dark-700/50">
                  <div>
                    <div className="font-medium text-dark-200">Remote Control Server</div>
                    <div className="text-xs text-dark-400">Mobile app connection</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={toggleRemoteServer} className={`p-2 rounded-lg transition-colors ${coreStatus?.remoteServer ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                      {coreStatus?.remoteServer ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>
                    <ServiceStatusBadge active={coreStatus?.remoteServer} />
                  </div>
                </div>
                <div className="bg-dark-900/50 p-4 rounded-lg flex items-center justify-between border border-dark-700/50">
                  <div>
                    <div className="font-medium text-dark-200">Synergy Manager</div>
                    <div className="text-xs text-dark-400">Agent collaboration system ({coreStatus?.workerCount || 0} agents)</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={toggleSynergy} className={`p-2 rounded-lg transition-colors ${coreStatus?.synergy ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                      {coreStatus?.synergy ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>
                    <ServiceStatusBadge active={coreStatus?.synergy} />
                  </div>
                </div>
                <div className="bg-dark-900/50 p-4 rounded-lg flex items-center justify-between border border-dark-700/50">
                  <div>
                    <div className="font-medium text-dark-200">Local API Server</div>
                    <div className="text-xs text-dark-400">REST API at http://127.0.0.1:31415</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={toggleLocalAPI} className={`p-2 rounded-lg transition-colors ${coreStatus?.localAPI ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                      {coreStatus?.localAPI ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>
                    <ServiceStatusBadge active={coreStatus?.localAPI} />
                  </div>
                </div>
              </div>
            </div>

            {/* Swarm Intelligence Protocols */}
            <div className="bg-dark-800 rounded-xl p-5 border border-dark-700 mb-6">
              <h3 className="font-semibold text-dark-100 mb-4 flex items-center gap-2">
                <Zap size={18} className="text-yellow-500" />
                Managed Swarm Protocols
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-dark-900/50 p-4 rounded-lg flex items-center justify-between border border-dark-700/50 group hover:border-primary-500/30 transition-all">
                  <div>
                    <div className="font-medium text-dark-200">DeepCode (Paper2Code)</div>
                    <div className="text-xs text-dark-400">Scientific synthesis & research translation</div>
                  </div>
                  <ServiceStatusBadge active={coreStatus?.synergy} />
                </div>
                <div className="bg-dark-900/50 p-4 rounded-lg flex items-center justify-between border border-dark-700/50 group hover:border-primary-500/30 transition-all">
                  <div>
                    <div className="font-medium text-dark-200">NanoBanna (Visual Swarm)</div>
                    <div className="text-xs text-dark-400">Autonomous design & creative orchestration</div>
                  </div>
                  <ServiceStatusBadge active={coreStatus?.synergy} />
                </div>
              </div>
            </div>

            {services.length === 0 ? (
              <div className="text-center py-12 bg-dark-800/50 rounded-2xl border border-dashed border-dark-700">
                <Layers size={48} className="mx-auto mb-4 text-dark-600" />
                <p className="text-dark-400 mb-4">No additional background services</p>
                <button
                  onClick={async () => {
                    setLoading(true)
                    try {
                      await window.electron.createDemoService()
                      loadData()
                    } catch (e) { console.error(e) }
                    setLoading(false)
                  }}
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm transition-colors"
                >
                  Create Demo Service
                </button>
              </div>
            ) : (
              services.map(service => (
                <div key={service.id} className="bg-dark-800 rounded-xl p-5 border border-dark-700 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${service.status === 'running' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-dark-600'}`} />
                    <div>
                      <h3 className="font-semibold text-dark-100">{service.name}</h3>
                      <p className="text-sm text-dark-400">{service.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {service.status === 'running' ? (
                      <button onClick={() => handleStopService(service.id)} className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-red-400 transition-colors">
                        <Square size={18} fill="currentColor" />
                      </button>
                    ) : (
                      <button onClick={() => handleStartService(service.id)} className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-green-400 transition-colors">
                        <Play size={18} fill="currentColor" />
                      </button>
                    )}
                    <button onClick={() => handleDeleteService(service.id)} className="p-2 bg-dark-700 hover:bg-red-900/30 rounded-lg text-dark-400 hover:text-red-400 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddCron(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors font-medium text-sm"
              >
                <Plus size={16} />
                Add Scheduled Task
              </button>
            </div>

            {showAddCron && (
              <div className="bg-dark-800 rounded-xl p-6 border border-dark-700 animate-fadeIn">
                <h3 className="text-lg font-semibold mb-4 text-dark-100">New Task</h3>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-xs font-medium text-dark-400 mb-1">Task Name</label>
                    <input
                      value={newTask.name}
                      onChange={e => setNewTask({ ...newTask, name: e.target.value })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-dark-100 text-sm focus:outline-none focus:border-primary-500"
                      placeholder="e.g. Daily Backup"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-dark-400 mb-1">Cron Schedule</label>
                      <input
                        value={newTask.schedule}
                        onChange={e => setNewTask({ ...newTask, schedule: e.target.value })}
                        className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-primary-400 font-mono text-sm focus:outline-none focus:border-primary-500"
                        placeholder="* * * * *"
                      />
                      <p className="text-[10px] text-dark-500 mt-1">Standard crontab format: min hour day month day-of-week</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-dark-400 mb-1">Command</label>
                      <input
                        value={newTask.command}
                        onChange={e => setNewTask({ ...newTask, command: e.target.value })}
                        className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-dark-100 font-mono text-sm focus:outline-none focus:border-primary-500"
                        placeholder="echo 'Hello'"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-2">
                    <button
                      onClick={() => setShowAddCron(false)}
                      className="px-4 py-2 text-dark-400 hover:text-dark-200 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddCron}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium"
                    >
                      Save Task
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {cronTasks.map(task => (
                <div key={task.id} className="bg-dark-800 rounded-xl p-5 border border-dark-700">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${task.enabled ? 'bg-primary-500/10 text-primary-400' : 'bg-dark-700 text-dark-500'}`}>
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-dark-100 flex items-center gap-2">
                          {task.name}
                          {!task.enabled && <span className="text-xs bg-dark-700 text-dark-400 px-2 py-0.5 rounded-full">Disabled</span>}
                        </h3>
                        <div className="flex items-center gap-4 mt-1">
                          <code className="text-xs bg-dark-900 px-1.5 py-0.5 rounded text-primary-300 font-mono">{task.schedule}</code>
                          <code className="text-xs text-dark-400 font-mono">{task.command}</code>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleCron(task.id, !task.enabled)}
                        className={`p-2 rounded-lg transition-colors ${task.enabled ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                          }`}
                        title={task.enabled ? 'Disable' : 'Enable'}
                      >
                        {task.enabled ? <CheckCircle size={18} /> : <XCircle size={18} />}
                      </button>
                      <button
                        onClick={() => handleDeleteCron(task.id)}
                        className="p-2 bg-dark-700 hover:bg-red-900/30 text-dark-400 hover:text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  {task.lastRun && (
                    <div className="mt-3 pt-3 border-t border-dark-700/50 flex items-center gap-2 text-xs text-dark-400">
                      <Clock size={12} />
                      <span>Last run: {new Date(task.lastRun).toLocaleString()}</span>
                      <span className="mx-1">•</span>
                      <span className={task.lastResult?.startsWith('Error') ? 'text-red-400' : 'text-green-400'}>
                        {task.lastResult}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {cronTasks.length === 0 && !showAddCron && (
                <div className="text-center py-12">
                  <Clock size={48} className="mx-auto mb-4 text-dark-600" />
                  <p className="text-dark-400">No scheduled tasks</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Services
