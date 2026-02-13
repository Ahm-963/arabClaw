import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileText, Settings, HelpCircle, Info, Download, Upload,
  RefreshCw, Trash2, FolderOpen, Save, Copy, Clipboard,
  Maximize2, Minimize2, Layout, Eye, EyeOff, Terminal,
  Cpu, Zap, Users, Bot, Puzzle, Globe, Moon, Sun,
  Volume2, VolumeX, Bell, BellOff, Shield, Key, Database,
  Github, ExternalLink, MessageSquare, Heart, Coffee, Smartphone, Clock, Monitor
} from 'lucide-react'

interface MenuBarProps {
  onOpenSettings: () => void
  onOpenAgents: () => void
  onOpenSkills: () => void
  onOpenServices: () => void
  onOpenHelp: () => void
  onOpenAbout: () => void
  onOpenLearning: () => void
  onOpenVoice: () => void
  onOpenRemote: () => void
  onOpenPlugins: () => void
  onOpenIntegrations: () => void
  onImportSkill: () => void
  onOpenWorkspace: () => void
  onSaveChat: () => void
  onExportSettings: () => void
  onImportSettings: () => void
  onClearChat: () => void
  onRegenerateResponse: () => void
  onDeleteLastMessage: () => void
  onToggleSidebar: () => void
  onToggleFullscreen: () => void
  onShowAgentActivity: () => void
  onShowLogs: () => void
  onToggleDarkMode: () => void
  onToggleDevTools: () => void
  onManageAgents: () => void
  onAgentCollaboration: () => void
  onQuickSwitchAgent: () => void
  onViewAgentStatus: () => void
  onExportSkill: () => void
  onServiceControl: () => void
  onDocumentAnalysis: () => void
  onOpenAutomation: () => void
  onOpenCanvas: () => void
}

function MenuBar({
  onOpenSettings,
  onOpenAgents,
  onOpenSkills,
  onOpenServices,
  onOpenHelp,
  onOpenAbout,
  onOpenLearning,
  onOpenVoice,
  onOpenRemote,
  onOpenPlugins,
  onOpenIntegrations,
  onImportSkill,
  onOpenWorkspace,
  onSaveChat,
  onExportSettings,
  onImportSettings,
  onClearChat,
  onRegenerateResponse,
  onDeleteLastMessage,
  onToggleSidebar,
  onToggleFullscreen,
  onShowAgentActivity,
  onShowLogs,
  onToggleDarkMode,
  onToggleDevTools,
  onManageAgents,
  onAgentCollaboration,
  onQuickSwitchAgent,
  onViewAgentStatus,
  onExportSkill,
  onServiceControl,
  onDocumentAnalysis,
  onOpenAutomation,
  onOpenCanvas
}: MenuBarProps) {
  const { t } = useTranslation()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const menus = [
    {
      id: 'file',
      label: t('menu.file', 'File'),
      items: [
        { icon: FolderOpen, label: t('menu.openWorkspace', 'Open Workspace'), shortcut: 'Ctrl+O', action: onOpenWorkspace },
        { icon: Save, label: t('menu.saveChat', 'Save Chat'), shortcut: 'Ctrl+S', action: onSaveChat },
        { divider: true },
        { icon: Download, label: t('menu.exportSettings', 'Export Settings'), action: onExportSettings },
        { icon: Upload, label: t('menu.importSettings', 'Import Settings'), action: onImportSettings },
        { divider: true },
        { icon: Puzzle, label: t('menu.importSkill', 'Import Skill'), action: onImportSkill },
        { icon: Download, label: t('menu.exportSkill', 'Export Skill'), action: onExportSkill },
        { divider: true },
        { icon: Trash2, label: t('menu.clearChat', 'Clear Chat History'), action: onClearChat },
        { divider: true },
        { icon: Settings, label: t('menu.settings', 'Settings'), shortcut: 'Ctrl+,', action: onOpenSettings }
      ]
    },
    {
      id: 'edit',
      label: t('menu.edit', 'Edit'),
      items: [
        { icon: Copy, label: t('menu.copy', 'Copy'), shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
        { icon: Clipboard, label: t('menu.paste', 'Paste'), shortcut: 'Ctrl+V', action: () => document.execCommand('paste') },
        { divider: true },
        { icon: RefreshCw, label: t('menu.regenerate', 'Regenerate Response'), shortcut: 'Ctrl+R', action: onRegenerateResponse },
        { divider: true },
        { icon: Trash2, label: t('menu.deleteMessage', 'Delete Last Message'), action: onDeleteLastMessage }
      ]
    },
    {
      id: 'view',
      label: t('menu.view', 'View'),
      items: [
        { icon: Layout, label: t('menu.toggleSidebar', 'Toggle Sidebar'), shortcut: 'Ctrl+B', action: onToggleSidebar },
        { icon: Maximize2, label: t('menu.fullscreen', 'Toggle Fullscreen'), shortcut: 'F11', action: onToggleFullscreen },
        { icon: Monitor, label: 'Visual Workspace', shortcut: 'Ctrl+Shift+V', action: onOpenCanvas },
        { divider: true },
        { icon: Eye, label: t('menu.showAgentActivity', 'Show Agent Activity'), action: onShowAgentActivity },
        { icon: Terminal, label: t('menu.showLogs', 'Show Logs'), action: onShowLogs },
        { divider: true },
        { icon: Moon, label: t('menu.darkMode', 'Dark Mode'), action: onToggleDarkMode },
        { divider: true },
        { icon: Terminal, label: t('menu.devTools', 'Developer Tools'), shortcut: 'F12', action: onToggleDevTools }
      ]
    },
    {
      id: 'agents',
      label: t('menu.agents', 'Agents'),
      items: [
        { icon: Bot, label: t('menu.manageAgents', 'Manage Agents'), action: onManageAgents },
        { icon: Users, label: t('menu.collaboration', 'Agent Collaboration'), action: onAgentCollaboration },
        { divider: true },
        { icon: Zap, label: t('menu.quickSwitch', 'Quick Switch Agent'), shortcut: 'Ctrl+Tab', action: onQuickSwitchAgent },
        { icon: Info, label: t('menu.agentStatus', 'View Agent Status'), action: onViewAgentStatus }
      ]
    },
    {
      id: 'skills',
      label: t('menu.skills', 'Skills'),
      items: [
        { icon: Puzzle, label: t('menu.manageSkills', 'Manage Skills'), action: onOpenSkills },
        { icon: Download, label: t('menu.importSkill', 'Import Skill'), action: onImportSkill },
        { icon: Upload, label: t('menu.exportSkill', 'Export Skill'), action: onExportSkill }
      ]
    },
    {
      id: 'services',
      label: t('menu.services', 'Services'),
      items: [
        { icon: Cpu, label: t('menu.manageServices', 'Manage Services'), action: onOpenServices },
        { icon: Zap, label: t('menu.serviceControl', 'Service Control'), action: onServiceControl }
      ]
    },
    {
      id: 'tools',
      label: t('menu.tools', 'Tools'),
      items: [
        { icon: Database, label: t('menu.learning', 'Learning & Memory'), action: onOpenLearning },
        { icon: Volume2, label: t('menu.voice', 'Voice Control'), action: onOpenVoice },
        { icon: Smartphone, label: t('menu.remote', 'Remote Control'), action: onOpenRemote },
        { icon: Puzzle, label: t('menu.extensions', 'Extensions'), action: onOpenPlugins },
        { icon: Globe, label: t('menu.integrations', 'Integrations'), action: onOpenIntegrations },
        { icon: Clock, label: t('menu.automation', 'Automation Engine'), action: onOpenAutomation },
        { divider: true },
        { icon: FileText, label: t('menu.documentAnalysis', 'Document Analysis'), action: onDocumentAnalysis }
      ]
    },
    {
      id: 'help',
      label: t('menu.help', 'Help'),
      items: [
        { icon: HelpCircle, label: t('menu.documentation', 'Documentation'), shortcut: 'F1', action: onOpenHelp },
        { icon: MessageSquare, label: t('menu.tutorials', 'Tutorials'), action: () => { } },
        { icon: Zap, label: t('menu.shortcuts', 'Keyboard Shortcuts'), action: () => { } },
        { divider: true },
        { icon: Github, label: t('menu.github', 'GitHub Repository'), action: () => window.electron?.openExternal('https://github.com') },
        { icon: ExternalLink, label: t('menu.website', 'Website'), action: () => { } },
        { divider: true },
        {
          icon: RefreshCw, label: t('menu.checkUpdates', 'Check for Updates'), action: () => {
            alert('Checking for updates...\n\nCurrent Version: v1.1.0-swarm\nYou are currently running the latest elite build.')
          }
        },
        { divider: true },
        { icon: Heart, label: t('menu.support', 'Support Project'), action: () => { } },
        { icon: Coffee, label: t('menu.buyMeCoffee', 'Buy Me a Coffee'), action: () => { } },
        { divider: true },
        { icon: Info, label: t('menu.about', 'About Rami Bot'), action: onOpenAbout }
      ]
    }
  ]

  const handleMenuClick = (menuId: string) => {
    setActiveMenu(activeMenu === menuId ? null : menuId)
  }

  const handleItemClick = (action: () => void) => {
    action()
    setActiveMenu(null)
  }

  return (
    <div className="menu-bar flex items-center bg-dark-900 border-b border-dark-700 px-2 h-8 text-sm select-none">
      {menus.map((menu) => (
        <div key={menu.id} className="relative">
          <button
            className={`px-3 py-1 rounded hover:bg-dark-700 transition-colors ${activeMenu === menu.id ? 'bg-dark-700' : ''
              }`}
            onClick={() => handleMenuClick(menu.id)}
            onMouseEnter={() => activeMenu && setActiveMenu(menu.id)}
          >
            {menu.label}
          </button>

          {activeMenu === menu.id && (
            <div className="absolute top-full left-0 mt-1 bg-dark-800 border border-dark-600 rounded-lg shadow-xl py-1 min-w-[220px] z-50">
              {menu.items.map((item: any, index) => (
                item.divider ? (
                  <div key={index} className="border-t border-dark-600 my-1" />
                ) : (
                  <button
                    key={index}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-dark-700 transition-colors text-left"
                    onClick={() => handleItemClick(item.action!)}
                  >
                    {item.icon && <item.icon size={16} className="text-dark-400" />}
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <span className="text-xs text-dark-500">{item.shortcut}</span>
                    )}
                  </button>
                )
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Click outside to close */}
      {activeMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setActiveMenu(null)}
        />
      )}
    </div>
  )
}

export default MenuBar
