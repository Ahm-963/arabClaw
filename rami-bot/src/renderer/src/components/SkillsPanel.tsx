import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Puzzle, Plus, Edit2, Trash2, Download, Upload, Search,
  X, Check, Zap, FolderOpen, Code, Globe, Settings,
  Volume2, MessageSquare, Cpu, FileText, Terminal
} from 'lucide-react'

interface Skill {
  id: string
  name: string
  description: string
  category: string
  code: string
  inputSchema: object
  isBuiltIn: boolean
  isEnabled: boolean
  createdAt: number
  updatedAt: number
}

interface Category {
  id: string
  name: string
  icon: string
  description: string
}

const CATEGORIES: Category[] = [
  { id: 'all', name: 'All Skills', icon: '🔧', description: 'All available skills' },
  { id: 'file', name: 'File & Code', icon: '📁', description: 'File operations and coding' },
  { id: 'web', name: 'Web & Search', icon: '🌐', description: 'Web browsing and search' },
  { id: 'system', name: 'System', icon: '⚙️', description: 'System control and info' },
  { id: 'media', name: 'Media', icon: '🎵', description: 'Media and audio control' },
  { id: 'communication', name: 'Communication', icon: '💬', description: 'Messaging and notifications' },
  { id: 'custom', name: 'Custom', icon: '✨', description: 'User-created skills' }
]

const CATEGORY_ICONS: Record<string, typeof Terminal> = {
  file: FileText,
  web: Globe,
  system: Settings,
  media: Volume2,
  communication: MessageSquare,
  custom: Zap
}

interface SkillsPanelProps {
  isOpen: boolean
  onClose: () => void
}

function SkillsPanel({ isOpen, onClose }: SkillsPanelProps) {
  const { t } = useTranslation()
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadSkills()
  }, [])

  const loadSkills = async () => {
    try {
      const loaded = await window.electron?.getSkills()
      if (loaded) setSkills(loaded)
    } catch (e) {
      // Default skills for demo
      setSkills([
        { id: 'bash', name: 'bash', description: 'Execute shell commands', category: 'file', code: '', inputSchema: {}, isBuiltIn: true, isEnabled: true, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'str_replace_editor', name: 'str_replace_editor', description: 'View and edit files', category: 'file', code: '', inputSchema: {}, isBuiltIn: true, isEnabled: true, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'web_search', name: 'web_search', description: 'Search the web', category: 'web', code: '', inputSchema: {}, isBuiltIn: true, isEnabled: true, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'screenshot', name: 'screenshot', description: 'Capture screen', category: 'system', code: '', inputSchema: {}, isBuiltIn: true, isEnabled: true, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'mouse_move', name: 'mouse_move', description: 'Move mouse cursor', category: 'system', code: '', inputSchema: {}, isBuiltIn: true, isEnabled: true, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'type_text', name: 'type_text', description: 'Type text on keyboard', category: 'system', code: '', inputSchema: {}, isBuiltIn: true, isEnabled: true, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'volume_up', name: 'volume_up', description: 'Increase volume', category: 'media', code: '', inputSchema: {}, isBuiltIn: true, isEnabled: true, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'show_notification', name: 'show_notification', description: 'Show desktop notification', category: 'communication', code: '', inputSchema: {}, isBuiltIn: true, isEnabled: true, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'speak', name: 'speak', description: 'Text-to-speech', category: 'communication', code: '', inputSchema: {}, isBuiltIn: true, isEnabled: true, createdAt: Date.now(), updatedAt: Date.now() }
      ])
    }
  }

  const filteredSkills = skills.filter(skill => {
    const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         skill.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const toggleSkill = async (id: string) => {
    const updated = skills.map(s => s.id === id ? { ...s, isEnabled: !s.isEnabled } : s)
    setSkills(updated)
    try {
      await window.electron?.toggleSkill(id)
    } catch (e) {}
  }

  const importSkill = async () => {
    try {
      const result = await window.electron?.showOpenDialog({
        filters: [{ name: 'Skill Files', extensions: ['json'] }]
      })
      if (result?.filePaths?.[0]) {
        await window.electron?.importSkill(result.filePaths[0])
        loadSkills()
      }
    } catch (e) {}
  }

  const exportSkill = async (skill: Skill) => {
    try {
      const result = await window.electron?.showSaveDialog({
        defaultPath: `${skill.name}.json`,
        filters: [{ name: 'Skill Files', extensions: ['json'] }]
      })
      if (result?.filePath) {
        await window.electron?.exportSkill(skill.id, result.filePath)
      }
    } catch (e) {}
  }

  const createSkill = () => {
    const newSkill: Skill = {
      id: Date.now().toString(),
      name: 'new_skill',
      description: 'A custom skill',
      category: 'custom',
      code: `// Custom skill code
async function execute(input) {
  // Your code here
  return { success: true, data: input }
}`,
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      },
      isBuiltIn: false,
      isEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    setEditingSkill(newSkill)
    setIsCreating(true)
  }

  const saveSkill = async (skill: Skill) => {
    if (isCreating) {
      setSkills([...skills, skill])
    } else {
      setSkills(skills.map(s => s.id === skill.id ? skill : s))
    }
    setEditingSkill(null)
    setIsCreating(false)
    try {
      await window.electron?.saveSkill(skill)
    } catch (e) {}
  }

  const deleteSkill = async (id: string) => {
    const skill = skills.find(s => s.id === id)
    if (skill?.isBuiltIn) return
    if (!confirm('Are you sure you want to delete this skill?')) return
    setSkills(skills.filter(s => s.id !== id))
    try {
      await window.electron?.deleteSkill(id)
    } catch (e) {}
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-2xl w-[1000px] max-h-[85vh] overflow-hidden shadow-2xl flex">
        {/* Sidebar - Categories */}
        <div className="w-64 bg-dark-850 border-r border-dark-700 p-4">
          <h3 className="text-sm font-semibold text-dark-400 uppercase mb-4">
            {t('skills.categories', 'Categories')}
          </h3>
          <div className="space-y-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                  selectedCategory === cat.id
                    ? 'bg-primary-600 text-white'
                    : 'hover:bg-dark-700'
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                <div>
                  <div className="font-medium">{cat.name}</div>
                  <div className="text-xs text-dark-400">{cat.description}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-dark-700">
            <div className="text-sm text-dark-400 mb-2">
              {t('skills.stats', 'Statistics')}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-500">Total Skills</span>
                <span className="font-semibold">{skills.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-500">Enabled</span>
                <span className="font-semibold text-green-400">
                  {skills.filter(s => s.isEnabled).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-500">Custom</span>
                <span className="font-semibold text-primary-400">
                  {skills.filter(s => !s.isBuiltIn).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-dark-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
                <Puzzle size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t('skills.title', 'Skills Manager')}</h2>
                <p className="text-sm text-dark-400">{t('skills.subtitle', 'Manage and extend bot capabilities')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={importSkill}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Upload size={18} />
                {t('skills.import', 'Import')}
              </button>
              <button
                onClick={createSkill}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus size={18} />
                {t('skills.create', 'Create Skill')}
              </button>
              <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-dark-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" size={18} />
              <input
                type="text"
                placeholder={t('skills.search', 'Search skills...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Skills Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-4">
              {filteredSkills.map((skill) => {
                const CategoryIcon = CATEGORY_ICONS[skill.category] || Zap
                return (
                  <div
                    key={skill.id}
                    className={`bg-dark-750 rounded-xl p-4 border border-dark-600 hover:border-dark-500 transition-all ${
                      !skill.isEnabled ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          skill.isBuiltIn ? 'bg-dark-600' : 'bg-purple-600/20'
                        }`}>
                          <CategoryIcon size={20} className={skill.isBuiltIn ? 'text-dark-400' : 'text-purple-400'} />
                        </div>
                        <div>
                          <h4 className="font-semibold font-mono">{skill.name}</h4>
                          <p className="text-sm text-dark-400 mt-0.5">{skill.description}</p>
                        </div>
                      </div>
                      
                      {/* Toggle */}
                      <button
                        onClick={() => toggleSkill(skill.id)}
                        className={`w-10 h-5 rounded-full transition-colors ${
                          skill.isEnabled ? 'bg-green-500' : 'bg-dark-600'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${
                          skill.isEnabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-dark-600">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        skill.isBuiltIn ? 'bg-dark-600 text-dark-400' : 'bg-purple-600/20 text-purple-400'
                      }`}>
                        {skill.isBuiltIn ? 'Built-in' : 'Custom'}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-dark-600 text-dark-400">
                        {skill.category}
                      </span>
                      <div className="flex-1" />
                      {!skill.isBuiltIn && (
                        <>
                          <button
                            onClick={() => setEditingSkill(skill)}
                            className="p-1.5 hover:bg-dark-600 rounded transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => exportSkill(skill)}
                            className="p-1.5 hover:bg-dark-600 rounded transition-colors"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={() => deleteSkill(skill.id)}
                            className="p-1.5 hover:bg-red-600/20 text-red-400 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {filteredSkills.length === 0 && (
              <div className="text-center py-12 text-dark-500">
                <Puzzle size={48} className="mx-auto mb-4 opacity-50" />
                <p>{t('skills.noSkills', 'No skills found')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Edit Skill Modal */}
        {editingSkill && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
            <div className="bg-dark-800 rounded-2xl w-[700px] max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b border-dark-700">
                <h3 className="text-xl font-bold">
                  {isCreating ? t('skills.createSkill', 'Create Skill') : t('skills.editSkill', 'Edit Skill')}
                </h3>
              </div>

              <div className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label className="text-sm text-dark-400 mb-2 block">{t('skills.name', 'Name')}</label>
                  <input
                    type="text"
                    value={editingSkill.name}
                    onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm text-dark-400 mb-2 block">{t('skills.description', 'Description')}</label>
                  <input
                    type="text"
                    value={editingSkill.description}
                    onChange={(e) => setEditingSkill({ ...editingSkill, description: e.target.value })}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-sm text-dark-400 mb-2 block">{t('skills.category', 'Category')}</label>
                  <select
                    value={editingSkill.category}
                    onChange={(e) => setEditingSkill({ ...editingSkill, category: e.target.value })}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Code */}
                <div>
                  <label className="text-sm text-dark-400 mb-2 block">{t('skills.code', 'Code')}</label>
                  <textarea
                    value={editingSkill.code}
                    onChange={(e) => setEditingSkill({ ...editingSkill, code: e.target.value })}
                    rows={10}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-dark-700 flex justify-end gap-3">
                <button
                  onClick={() => { setEditingSkill(null); setIsCreating(false) }}
                  className="px-6 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={() => saveSkill(editingSkill)}
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors"
                >
                  {t('common.save', 'Save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SkillsPanel
