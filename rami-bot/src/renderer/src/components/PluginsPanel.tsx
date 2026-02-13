import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Puzzle, Upload, Trash2, Power, AlertTriangle, X, CheckCircle } from 'lucide-react'

interface Plugin {
    id: string
    name: string
    version: string
    description: string
    author: string
    enabled: boolean
}

interface PluginsPanelProps {
    isOpen: boolean
    onClose: () => void
}

function PluginsPanel({ isOpen, onClose }: PluginsPanelProps) {
    const { t } = useTranslation()
    const [plugins, setPlugins] = useState<Plugin[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadPlugins()
        }
    }, [isOpen])

    const loadPlugins = async () => {
        setLoading(true)
        try {
            const list = await window.electron?.invoke('plugins:list')
            setPlugins(list || [])
        } catch (error) {
            console.error('Failed to load plugins:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleLoadPlugin = async () => {
        try {
            const result = await window.electron?.showOpenDialog({
                properties: ['openDirectory', 'multiSelections']
            })

            if (result?.filePaths && result.filePaths.length > 0) {
                for (const path of result.filePaths) {
                    await window.electron?.invoke('plugins:load', path)
                }
                loadPlugins()
            }
        } catch (error) {
            console.error('Failed to load plugin:', error)
        }
    }

    const handleUnloadPlugin = async (id: string) => {
        if (confirm('Are you sure you want to unload this plugin?')) {
            await window.electron?.invoke('plugins:unload', id)
            loadPlugins()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-800 rounded-2xl w-[600px] h-[500px] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-dark-700 bg-dark-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-400">
                            <Puzzle size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{t('plugins.title', 'Community Extensions')}</h2>
                            <p className="text-sm text-dark-400">{t('plugins.subtitle', 'Manage functionality plugins')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Warning */}
                <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-3 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-yellow-500 mt-0.5" />
                    <p className="text-xs text-yellow-200/80">
                        Warning: Plugins can access your files and network. Only load plugins from trusted sources.
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-medium text-dark-200">Installed Plugins ({plugins.length})</h3>
                        <button
                            onClick={handleLoadPlugin}
                            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition-colors"
                        >
                            <Upload size={16} />
                            Load Unpacked
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                        </div>
                    ) : plugins.length === 0 ? (
                        <div className="text-center py-12 text-dark-500 border-2 border-dashed border-dark-700 rounded-xl">
                            <Puzzle size={48} className="mx-auto mb-3 opacity-20" />
                            <p>No plugins installed.</p>
                            <p className="text-sm mt-1">Load a plugin to extend functionality.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {plugins.map(plugin => (
                                <div key={plugin.id} className="bg-dark-750 border border-dark-700 rounded-xl p-4 flex justify-between items-start hover:border-dark-600 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-white">{plugin.name}</h4>
                                            <span className="text-xs bg-dark-600 text-dark-300 px-1.5 py-0.5 rounded">v{plugin.version}</span>
                                            {plugin.enabled && <CheckCircle size={14} className="text-green-500" />}
                                        </div>
                                        <p className="text-sm text-dark-300 mb-2">{plugin.description}</p>
                                        <div className="text-xs text-dark-500 flex gap-3">
                                            <span>By {plugin.author}</span>
                                            <span>ID: {plugin.id}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button className="p-2 bg-dark-700 hover:bg-dark-600 rounded text-dark-300 hover:text-white" title="Toggle (Coming Soon)">
                                            <Power size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleUnloadPlugin(plugin.id)}
                                            className="p-2 bg-dark-700 hover:bg-red-500/20 rounded text-dark-300 hover:text-red-400 transition-colors"
                                            title="Unload"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PluginsPanel
