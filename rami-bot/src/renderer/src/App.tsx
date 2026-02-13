import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from './stores/store'
import TitleBar from './components/TitleBar'
import MenuBar from './components/MenuBar'
import Sidebar from './components/Sidebar'
import SynergyDashboard from './components/SynergyDashboard'
import ChatWindow from './components/ChatWindow'
import Settings from './components/Settings'
import Services from './components/Services'
import AgentsPanel from './components/AgentsPanel'
import SkillsPanel from './components/SkillsPanel'
import HelpPanel from './components/HelpPanel'
import AboutPanel from './components/AboutPanel'
import LearningPanel from './components/LearningPanel'
import VoicePanel from './components/VoicePanel'
import RemoteControlPanel from './components/RemoteControlPanel'
import PluginsPanel from './components/PluginsPanel'
import IntegrationsPanel from './components/IntegrationsPanel'
import DocumentAnalysisPanel from './components/DocumentAnalysisPanel'
import OnboardingModal from './components/OnboardingModal'
import TelegramPage from './components/platforms/TelegramPage'
import WhatsAppPage from './components/platforms/WhatsAppPage'
import DiscordPage from './components/platforms/DiscordPage'
import { QualityPanel } from './components/QualityPanel'
import AutomationPanel from './components/AutomationPanel'
import CanvasPanel from './components/CanvasPanel'
import SignalPage from './components/platforms/SignalPage'
import TeamsPage from './components/platforms/TeamsPage'
import MatrixPage from './components/platforms/MatrixPage'
import IMessagePage from './components/platforms/IMessagePage'
import SlackPage from './components/platforms/SlackPage'

function App() {
  const { i18n } = useTranslation()
  const {
    currentView,
    setCurrentView,
    settings,
    updateSettings,
    setSettings,
    setTelegramStatus,
    setDiscordStatus,
    setSlackStatus,
    setWhatsappStatus,
    setSignalStatus,
    setTeamsStatus,
    setMatrixStatus,
    setImessageStatus,
    settingsLoaded,
    hasOnboarded
  } = useAppStore()

  // Panel states
  const [agentsPanelOpen, setAgentsPanelOpen] = useState(false)
  const [agentsPanelMode, setAgentsPanelMode] = useState<'default' | 'collaboration'>('default')
  const [synergyDashboardOpen, setSynergyDashboardOpen] = useState(false)
  const [skillsPanelOpen, setSkillsPanelOpen] = useState(false)
  const [helpPanelOpen, setHelpPanelOpen] = useState(false)
  const [aboutPanelOpen, setAboutPanelOpen] = useState(false)
  const [learningPanelOpen, setLearningPanelOpen] = useState(false)
  const [voicePanelOpen, setVoicePanelOpen] = useState(false)
  const [voicePanelMode, setVoicePanelMode] = useState<'default' | 'listen'>('default')
  const [remotePanelOpen, setRemotePanelOpen] = useState(false)
  const [pluginsPanelOpen, setPluginsPanelOpen] = useState(false)
  const [integrationsPanelOpen, setIntegrationsPanelOpen] = useState(false)
  const [documentAnalysisOpen, setDocumentAnalysisOpen] = useState(false)
  const [automationPanelOpen, setAutomationPanelOpen] = useState(false)

  const [currentAgentId, setCurrentAgentId] = useState<string>('1')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [agentActivityOpen, setAgentActivityOpen] = useState(false)

  // Handlers for Menu actions
  const handleOpenWorkspace = async () => {
    try {
      const result = await window.electron?.showOpenDialog({
        properties: ['openDirectory']
      })
      if (result?.filePaths?.[0]) {
        // TODO: Handle workspace opening (load files, etc.)
        console.log('Workspace opened:', result.filePaths[0])
      }
    } catch (e) {
      console.error('Failed to open workspace', e)
    }
  }

  const handleSaveChat = async () => {
    await window.electron?.saveChat?.()
  }

  const handleRegenerateResponse = () => {
    // TODO: Trigger regeneration in ChatWindow
    console.log('Regenerate response clicked')
  }

  const handleDeleteLastMessage = () => {
    // TODO: Trigger deletion in ChatWindow
    console.log('Delete last message clicked')
  }

  const handleToggleSidebar = () => setSidebarOpen(!sidebarOpen)

  const handleToggleFullscreen = () => {
    window.electron?.toggleFullscreen?.()
  }

  const handleShowLogs = () => {
    window.electron?.openLogs?.()
  }

  const handleToggleDarkMode = () => {
    document.documentElement.classList.toggle('dark')
  }

  const handleManageAgents = () => {
    setAgentsPanelMode('default')
    setAgentsPanelOpen(true)
  }

  const handleAgentCollaboration = () => {
    setAgentsPanelMode('collaboration')
    setAgentsPanelOpen(true)
  }

  const handleQuickSwitchAgent = () => {
    setAgentsPanelMode('default')
    setAgentsPanelOpen(true)
  }

  const handleViewAgentStatus = () => {
    setAgentsPanelMode('default')
    setAgentsPanelOpen(true)
  }

  const handleExportSkill = () => {
    alert('Export Skill feature coming soon')
  }

  const handleNavigate = (view: any) => {
    setAgentsPanelOpen(false)
    setHelpPanelOpen(false)
    setLearningPanelOpen(false)
    setVoicePanelOpen(false)
    setRemotePanelOpen(false)
    setIntegrationsPanelOpen(false)
    setDocumentAnalysisOpen(false)
    setAutomationPanelOpen(false)
    setSkillsPanelOpen(false)
    setAboutPanelOpen(false)
    setPluginsPanelOpen(false)
    setCurrentView(view)
  }

  const handleServiceControl = () => handleNavigate('services')

  const handleOpenCanvas = () => handleNavigate('canvas')

  const handleDocumentAnalysis = () => {
    setDocumentAnalysisOpen(true)
  }

  // Load settings and set language direction on mount
  useEffect(() => {
    const loadInitialSettings = async () => {
      try {
        const loaded = await window.electron?.loadSettings()
        if (loaded) {
          setSettings(loaded)

          // Set language
          if (loaded.language) {
            i18n.changeLanguage(loaded.language)
            const dir = ['ar', 'he'].includes(loaded.language) ? 'rtl' : 'ltr'
            document.documentElement.dir = dir
            document.documentElement.lang = loaded.language
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    loadInitialSettings()
  }, [])

  // Listen for Platform status changes
  useEffect(() => {
    const unsubTelegram = window.electron?.onTelegramStatusChanged?.((status: string) => setTelegramStatus(status))
    const unsubWhatsapp = window.electron?.on('whatsapp:status', (status: any) => setWhatsappStatus(status))
    const unsubSignal = window.electron?.on('signal:status', (status: any) => setSignalStatus(status))
    const unsubTeams = window.electron?.on('teams:status', (status: any) => setTeamsStatus(status))
    const unsubMatrix = window.electron?.on('matrix:status', (status: any) => setMatrixStatus(status))
    const unsubImessage = window.electron?.on('imessage:status', (status: any) => setImessageStatus(status))

    return () => {
      unsubTelegram?.()
      if (typeof unsubWhatsapp === 'function') unsubWhatsapp()
      if (typeof unsubSignal === 'function') unsubSignal()
      if (typeof unsubTeams === 'function') unsubTeams()
      if (typeof unsubMatrix === 'function') unsubMatrix()
      if (typeof unsubImessage === 'function') unsubImessage()
    }
  }, [])

  // Listen for organization task updates
  useEffect(() => {
    const { addMessage } = useAppStore.getState()
    const unsubscribe = window.electron?.onOrgUpdate((data: any) => {
      // Convert org update to chat message
      const message = {
        id: `org_${Date.now()}_${Math.random()}`,
        chatId: 'local',
        text: data.message,
        sender: 'agent' as const,
        timestamp: Date.now(),
        platform: 'organization',
        agentName: data.agentName,
        agentAvatar: data.agentId
      }
      addMessage(message)
    })
    return () => unsubscribe?.()
  }, [])

  // Listen for remote messages (Mobile App)
  useEffect(() => {
    const { addMessage } = useAppStore.getState()
    const unsubscribeMessage = window.electron?.on('remote:message-received', (data: any) => {
      addMessage({
        id: `remote_${Date.now()}`,
        chatId: 'local',
        text: data.text,
        sender: 'user',
        timestamp: Date.now(),
        platform: 'remote'
      })
    }) as any

    const unsubscribeCommand = window.electron?.on('remote:command-received', (data: any) => {
      if (data.command === 'stop-voice') {
        window.electron?.stopSpeaking()
      }
    }) as any

    const unsubscribeHotkey = window.electron?.on('voice:listen-start', () => {
      setVoicePanelMode('listen')
      setVoicePanelOpen(true)
    }) as any

    return () => {
      unsubscribeMessage?.()
      unsubscribeCommand?.()
      unsubscribeHotkey?.()
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+, for settings
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault()
        setCurrentView(currentView === 'settings' ? 'chat' : 'settings')
      }
      // F1 for help
      if (e.key === 'F1') {
        e.preventDefault()
        setHelpPanelOpen(true)
      }
      // F12 for dev tools
      if (e.key === 'F12') {
        e.preventDefault()
        window.electron?.toggleDevTools()
      }
      // Escape to close panels
      if (e.key === 'Escape') {
        setAgentsPanelOpen(false)
        setSkillsPanelOpen(false)
        setHelpPanelOpen(false)
        setAboutPanelOpen(false)
        setLearningPanelOpen(false)
        setVoicePanelOpen(false)
        setRemotePanelOpen(false)
        setIntegrationsPanelOpen(false)
        setDocumentAnalysisOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentView])

  const handleImportSkill = async () => {
    try {
      const result = await window.electron?.showOpenDialog({
        filters: [{ name: 'Skill Files', extensions: ['json'] }]
      })
      if (result?.filePaths?.[0]) {
        await window.electron?.importSkill(result.filePaths[0])
      }
    } catch (e) {
      console.error('Import skill failed:', e)
    }
  }

  const handleExportSettings = async () => {
    try {
      const result = await window.electron?.showSaveDialog({
        defaultPath: 'rami-bot-settings.json',
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (result?.filePath) {
        await window.electron?.exportSettings(result.filePath)
      }
    } catch (e) {
      console.error('Export settings failed:', e)
    }
  }

  const handleImportSettings = async () => {
    try {
      const result = await window.electron?.showOpenDialog({
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (result?.filePaths?.[0]) {
        await window.electron?.importSettings(result.filePaths[0])
        // Reload settings
        const loaded = await window.electron?.loadSettings()
        if (loaded) setSettings(loaded)
      }
    } catch (e) {
      console.error('Import settings failed:', e)
    }
  }

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear all chat history?')) {
      // Clear chat implementation
    }
  }

  const handleToggleDevTools = () => {
    window.electron?.toggleDevTools()
  }

  const renderMainContent = () => {
    switch (currentView) {
      case 'settings':
        return <Settings />
      case 'services':
        return <Services />
      case 'synergy':
        return <SynergyDashboard isOpen={true} onClose={() => handleNavigate('chat')} />
      case 'quality':
        return <QualityPanel />
      case 'telegram':
        return <TelegramPage />
      case 'whatsapp':
        return <WhatsAppPage />
      case 'signal':
        return <SignalPage />
      case 'teams':
        return <TeamsPage />
      case 'matrix':
        return <MatrixPage />
      case 'imessage':
        return <IMessagePage />
      case 'slack':
        return <SlackPage />
      case 'discord':
        return <DiscordPage />
      case 'canvas':
        return <CanvasPanel />
      case 'chat':
      default:
        return <ChatWindow currentAgentId={currentAgentId} />
    }
  }

  return (
    <div className="h-screen flex flex-col bg-dark-900 text-dark-100 overflow-hidden">
      {/* Title Bar */}
      <TitleBar />

      {/* Onboarding Modal */}
      {settingsLoaded && !hasOnboarded && <OnboardingModal />}

      {/* Menu Bar */}
      <MenuBar
        onOpenSettings={() => handleNavigate('settings')}
        onOpenAgents={() => setAgentsPanelOpen(true)}
        onOpenSkills={() => setSkillsPanelOpen(true)}
        onOpenServices={() => handleNavigate('services')}
        onOpenHelp={() => setHelpPanelOpen(true)}
        onOpenAbout={() => setAboutPanelOpen(true)}
        onOpenLearning={() => setLearningPanelOpen(true)}
        onOpenVoice={() => setVoicePanelOpen(true)}
        onOpenRemote={() => setRemotePanelOpen(true)}
        onOpenPlugins={() => setPluginsPanelOpen(true)}
        onOpenIntegrations={() => setIntegrationsPanelOpen(true)}
        onImportSkill={handleImportSkill}

        onOpenWorkspace={handleOpenWorkspace}
        onSaveChat={handleSaveChat}
        onExportSettings={handleExportSettings}
        onImportSettings={handleImportSettings}
        onClearChat={handleClearChat}

        onRegenerateResponse={handleRegenerateResponse}
        onDeleteLastMessage={handleDeleteLastMessage}

        onToggleSidebar={handleToggleSidebar}
        onToggleFullscreen={handleToggleFullscreen}
        onShowAgentActivity={() => setAgentActivityOpen(!agentActivityOpen)}
        onShowLogs={handleShowLogs}
        onToggleDarkMode={handleToggleDarkMode}
        onToggleDevTools={handleToggleDevTools}

        onManageAgents={handleManageAgents}
        onAgentCollaboration={handleAgentCollaboration}
        onQuickSwitchAgent={handleQuickSwitchAgent}
        onViewAgentStatus={handleViewAgentStatus}

        onExportSkill={handleExportSkill}

        onServiceControl={() => handleNavigate('services')}
        onDocumentAnalysis={handleDocumentAnalysis}
        onOpenAutomation={() => setAutomationPanelOpen(true)}
        onOpenCanvas={handleOpenCanvas}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <Sidebar
            currentAgentId={currentAgentId}
            onAgentClick={() => setAgentsPanelOpen(true)}
            onOpenIntegrations={() => setIntegrationsPanelOpen(true)}
            onOpenAutomation={() => setAutomationPanelOpen(true)}
            onOpenCanvas={handleOpenCanvas}
            onNavigate={handleNavigate}
          />
        )}

        {/* Main Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {renderMainContent()}
        </main>
      </div>

      {/* Panels */}
      <AgentsPanel
        isOpen={agentsPanelOpen}
        onClose={() => {
          setAgentsPanelOpen(false)
          setAgentsPanelMode('default')
        }}
        onSelectAgent={(id) => {
          setCurrentAgentId(id)
          setAgentsPanelOpen(false)
        }}
        currentAgentId={currentAgentId}
        initialMode={agentsPanelMode}
      />

      <SkillsPanel
        isOpen={skillsPanelOpen}
        onClose={() => setSkillsPanelOpen(false)}
      />

      <HelpPanel
        isOpen={helpPanelOpen}
        onClose={() => setHelpPanelOpen(false)}
      />

      <AboutPanel
        isOpen={aboutPanelOpen}
        onClose={() => setAboutPanelOpen(false)}
      />

      <LearningPanel
        isOpen={learningPanelOpen}
        onClose={() => setLearningPanelOpen(false)}
      />

      <VoicePanel
        isOpen={voicePanelOpen}
        mode={voicePanelMode}
        onClose={() => {
          setVoicePanelOpen(false)
          setVoicePanelMode('default')
        }}
        onSpeak={(text, options) => window.electron?.speak(text, options)}
      />

      <RemoteControlPanel
        isOpen={remotePanelOpen}
        onClose={() => setRemotePanelOpen(false)}
      />

      <PluginsPanel
        isOpen={pluginsPanelOpen}
        onClose={() => setPluginsPanelOpen(false)}
      />

      {/* Advanced Synergy Dashboard */}
      {agentsPanelOpen && agentsPanelMode === 'collaboration' && (
        <SynergyDashboard
          isOpen={true} // It's embedded or overlay
          onClose={() => setAgentsPanelOpen(false)}
        />
      )}

      <IntegrationsPanel
        isOpen={integrationsPanelOpen}
        onClose={() => setIntegrationsPanelOpen(false)}
      />

      <DocumentAnalysisPanel
        isOpen={documentAnalysisOpen}
        onClose={() => setDocumentAnalysisOpen(false)}
      />

      <AutomationPanel
        isOpen={automationPanelOpen}
        onClose={() => setAutomationPanelOpen(false)}
      />
    </div>
  )
}

export default App
