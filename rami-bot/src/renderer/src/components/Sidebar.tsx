import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../stores/store'
import {
  MessageSquare, Settings, Bot, Puzzle, Cpu, Plus,
  ChevronDown, ChevronRight, Circle, Wifi, WifiOff,
  Smartphone, Globe, Users, Zap, MoreHorizontal, Clock,
  Layout, Shield, Box, Sparkles, Monitor
} from 'lucide-react'

// Platform Icons
const TelegramIcon = ({ color, size, ...props }: any) => (
  <svg viewBox="0 0 24 24" width={size || 18} height={size || 18} fill={color || 'currentColor'} {...props}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
  </svg>
)

const WhatsAppIcon = ({ color, size, ...props }: any) => (
  <svg viewBox="0 0 24 24" width={size || 18} height={size || 18} fill={color || 'currentColor'} {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

const DiscordIcon = ({ color, size, ...props }: any) => (
  <svg viewBox="0 0 24 24" width={size || 18} height={size || 18} fill={color || 'currentColor'} {...props}>
    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

interface Agent {
  id: string
  name: string
  avatar: string
  color: string
  isActive: boolean
}

interface SidebarProps {
  currentAgentId: string
  onAgentClick: () => void
  onOpenIntegrations: () => void
  onOpenAutomation: () => void
  onOpenCanvas: () => void
  onNavigate: (view: string) => void
}

function Sidebar({ currentAgentId, onAgentClick, onOpenIntegrations, onOpenAutomation, onOpenCanvas, onNavigate }: SidebarProps) {
  const { t } = useTranslation()
  const {
    currentView,
    telegramStatus, discordStatus, slackStatus, whatsappStatus,
    signalStatus, teamsStatus, matrixStatus, imessageStatus
  } = useAppStore()
  const [platformsExpanded, setPlatformsExpanded] = useState(false)
  const [agentsExpanded, setAgentsExpanded] = useState(true)
  const [agents, setAgents] = useState<Agent[]>([])

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const result = await window.electron.getAgents()
        if (Array.isArray(result)) {
          setAgents(result)
        }
      } catch (error) { }
    }

    fetchAgents()
    const unsubscribe = window.electron.on('org:agent_hired' as any, () => fetchAgents())
    return () => { if (typeof unsubscribe === 'function') unsubscribe() }
  }, [])

  const platforms = [
    { id: 'telegram', name: 'Telegram', icon: TelegramIcon, status: telegramStatus, color: '#0088cc' },
    { id: 'discord', name: 'Discord', icon: DiscordIcon, status: discordStatus, color: '#5865F2' },
    { id: 'slack', name: 'Slack', icon: (props: any) => <MessageSquare {...props} />, status: slackStatus, color: '#4A154B' },
    { id: 'whatsapp', name: 'WhatsApp', icon: WhatsAppIcon, status: whatsappStatus, color: '#25D366' },
    { id: 'signal', name: 'Signal', icon: (props: any) => <Shield {...props} />, status: signalStatus, color: '#3A76F0' },
    { id: 'teams', name: 'Teams', icon: (props: any) => <Smartphone {...props} />, status: teamsStatus, color: '#6264A7' },
    { id: 'matrix', name: 'Matrix', icon: (props: any) => <Globe {...props} />, status: matrixStatus, color: '#000' },
    { id: 'imessage', name: 'iMessage', icon: (props: any) => <MessageSquare {...props} />, status: imessageStatus, color: '#5AC8FA' }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500 animate-pulse'
      case 'error': return 'bg-red-500'
      default: return 'bg-dark-600'
    }
  }

  const currentAgent = agents.find(a => a.id === currentAgentId)

  const NavItem = ({ id, icon: Icon, label, color, badge, onClick }: any) => {
    const isActive = currentView === id
    return (
      <button
        onClick={onClick || (() => onNavigate(id))}
        className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative overflow-hidden ${isActive
          ? 'bg-primary-600/10 text-primary-400 border border-primary-500/20 shadow-lg shadow-primary-500/5'
          : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
          }`}
      >
        {isActive && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary-500 rounded-r-full" />}
        <Icon size={18} className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary-400' : ''}`} color={color} />
        <span className={`text-sm font-medium ${isActive ? 'font-bold' : ''}`}>{label}</span>
        {badge && (
          <span className="ml-auto text-[10px] bg-dark-700 text-dark-300 px-1.5 py-0.5 rounded-full border border-dark-600">
            {badge}
          </span>
        )}
      </button>
    )
  }

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-800 flex flex-col h-full backdrop-blur-3xl">
      {/* Brand / Logo */}
      <div className="p-6 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/20 animate-pulse-slow">
            <Zap size={18} className="text-white" fill="white" />
          </div>
          <span className="text-lg font-black tracking-tighter text-white uppercase italic">Arabclaw</span>
        </div>
      </div>

      {/* Active Agent Highlight */}
      <div className="px-3 mb-6">
        <div
          onClick={onAgentClick}
          className="p-3 rounded-2xl bg-dark-800/40 border border-dark-700/50 hover:bg-dark-800/60 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner"
              style={{ backgroundColor: (currentAgent?.color || '#3b82f6') + '20' }}
            >
              {currentAgent?.avatar || '🤖'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-dark-100 truncate">{currentAgent?.name || 'Rami'}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              </div>
              <p className="text-[10px] font-bold text-primary-500/80 uppercase tracking-widest leading-none mt-1">Sovereign</p>
            </div>
            <ChevronRight size={14} className="text-dark-600 group-hover:text-dark-400 transition-colors" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-6 custom-scrollbar pb-6">
        {/* Core Apps */}
        <div className="space-y-1">
          <NavItem id="chat" icon={MessageSquare} label={t('sidebar.chat')} onClick={() => onNavigate('chat')} />
          <NavItem id="canvas" icon={Monitor} label="Visuals" onClick={onOpenCanvas} />
          <NavItem id="synergy" icon={Layout} label="Dashboard" onClick={() => onNavigate('synergy')} />
          <NavItem id="quality" icon={Sparkles} label="Quality" color="#fbbf24" onClick={() => onNavigate('quality')} />
          <NavItem id="services" icon={Box} label="Services" onClick={() => onNavigate('services')} />
          <NavItem id="integrations" icon={Globe} label="Integrations" onClick={onOpenIntegrations} />
          <NavItem id="settings" icon={Settings} label="Settings" />
        </div>

        {/* Platforms Accordion */}
        <div>
          <button
            onClick={() => setPlatformsExpanded(!platformsExpanded)}
            className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black text-dark-500 hover:text-dark-300 transition-colors uppercase tracking-[0.2em]"
          >
            {platformsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>{t('sidebar.platforms')}</span>
            <div className="h-[1px] flex-1 bg-dark-800 ml-2" />
          </button>

          {platformsExpanded && (
            <div className="mt-2 grid grid-cols-4 gap-2 px-1">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => onNavigate(platform.id)}
                  title={`${platform.name}: ${platform.status}`}
                  className={`aspect-square rounded-xl flex items-center justify-center transition-all relative group ${currentView === platform.id
                    ? 'bg-dark-700 border border-dark-600 shadow-inner scale-95'
                    : 'bg-dark-800/50 hover:bg-dark-800 border border-transparent hover:border-dark-700'
                    }`}
                >
                  <platform.icon size={18} color={platform.status === 'connected' ? platform.color : '#4b5563'} strokeWidth={1.5} />
                  <div className={`absolute bottom-1 right-1 w-2 h-2 rounded-full border-2 border-dark-900 ${getStatusColor(platform.status)}`} />

                  {/* Tooltip on hover */}
                  <div className="absolute left-1/2 -top-8 -translate-x-1/2 px-2 py-1 bg-dark-700 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {platform.name}: {platform.status}
                  </div>
                </button>
              ))}
              <button
                onClick={onOpenIntegrations}
                className="aspect-square rounded-xl bg-dark-800/20 border border-dashed border-dark-700 flex items-center justify-center text-dark-500 hover:text-dark-300 hover:border-dark-600 transition-all"
              >
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Agents Accordion */}
        <div>
          <button
            onClick={() => setAgentsExpanded(!agentsExpanded)}
            className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black text-dark-500 hover:text-dark-300 transition-colors uppercase tracking-[0.2em]"
          >
            {agentsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>Swarm Hub</span>
            <div className="h-[1px] flex-1 bg-dark-800 ml-2" />
          </button>

          {agentsExpanded && (
            <div className="space-y-1 mt-2">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={onAgentClick}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${currentAgentId === agent.id
                    ? 'bg-dark-800 border border-dark-700 shadow-lg'
                    : 'hover:bg-dark-800/40 text-dark-400'
                    }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-inner"
                    style={{ backgroundColor: (agent.color || '#3b82f6') + '15' }}
                  >
                    {agent.avatar}
                  </div>
                  <div className="text-left flex-1">
                    <p className={`text-xs font-bold leading-none ${currentAgentId === agent.id ? 'text-dark-100' : 'text-dark-300'}`}>{agent.name}</p>
                    <p className="text-[9px] text-dark-500 mt-0.5">Active Session</p>
                  </div>
                  {agent.isActive && (
                    <div className="w-1 h-1 rounded-full bg-green-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Footer Status */}
      <div className="p-4 bg-dark-950/50 backdrop-blur-md border-t border-dark-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            <span className="text-[10px] font-bold text-dark-300 uppercase tracking-tighter">System Ready</span>
          </div>
          <button className="p-1.5 hover:bg-dark-800 rounded-lg text-dark-500 transition-colors">
            <MoreHorizontal size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-dark-800/50 p-2 rounded-lg border border-dark-700/50 text-center">
            <p className="text-[8px] text-dark-500 uppercase font-black tracking-widest mb-1">Skills</p>
            <p className="text-xs font-bold text-primary-400">45 Active</p>
          </div>
          <div className="bg-dark-800/50 p-2 rounded-lg border border-dark-700/50 text-center">
            <p className="text-[8px] text-dark-500 uppercase font-black tracking-widest mb-1">Uptime</p>
            <p className="text-xs font-bold text-green-400">99.9%</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[9px] text-dark-600 font-bold tracking-[0.15em] uppercase opacity-50">
            Engineered by <span className="text-dark-400">Rami Shaheen</span>
          </p>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
