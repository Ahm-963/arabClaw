import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bot, X, Heart, Github, Globe, Mail, Coffee,
  Zap, Shield, Code, Users, Sparkles
} from 'lucide-react'

interface AboutPanelProps {
  isOpen: boolean
  onClose: () => void
}

function AboutPanel({ isOpen, onClose }: AboutPanelProps) {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-2xl w-[500px] overflow-hidden shadow-2xl">
        {/* Header with gradient */}
        <div className="relative h-40 bg-gradient-to-br from-primary-600 via-purple-600 to-pink-600 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 shadow-xl">
              <Bot size={48} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Arabclaw</h1>
            <p className="text-white/80 text-sm">رامي بوט • רמי בוט</p>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Version */}
          <div className="text-center mb-6">
            <span className="px-4 py-1.5 bg-primary-600/20 text-primary-400 rounded-full text-sm font-medium">
              Version 5.0.0
            </span>
          </div>

          {/* Description */}
          <p className="text-center text-dark-300 mb-6">
            {t('about.description', 'A powerful autonomous AI assistant with full computer control, multi-agent collaboration, and extensible skills system.')}
          </p>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-dark-300">
              <Zap size={16} className="text-yellow-400" />
              <span>45+ Tools</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-dark-300">
              <Users size={16} className="text-blue-400" />
              <span>Multi-Agent</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-dark-300">
              <Globe size={16} className="text-green-400" />
              <span>3 Languages</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-dark-300">
              <Shield size={16} className="text-purple-400" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-dark-300">
              <Code size={16} className="text-pink-400" />
              <span>Extensible</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-dark-300">
              <Sparkles size={16} className="text-orange-400" />
              <span>Autonomous</span>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="bg-dark-750 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-dark-400 mb-2">Built With</h3>
            <div className="flex flex-wrap gap-2">
              {['Electron', 'React', 'TypeScript', 'Claude AI', 'Tailwind CSS', 'Node.js'].map((tech) => (
                <span key={tech} className="px-2 py-1 bg-dark-600 rounded text-xs text-dark-300">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="flex justify-center gap-4 mb-6">
            <a
              href="#"
              className="p-3 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors"
              title="GitHub"
            >
              <Github size={20} />
            </a>
            <a
              href="#"
              className="p-3 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors"
              title="Website"
            >
              <Globe size={20} />
            </a>
            <a
              href="#"
              className="p-3 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors"
              title="Email"
            >
              <Mail size={20} />
            </a>
            <a
              href="#"
              className="p-3 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors"
              title="Support"
            >
              <Coffee size={20} />
            </a>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-dark-500">
            <p className="flex items-center justify-center gap-1">
              Made with <Heart size={14} className="text-red-500" fill="currentColor" /> by Dr. Rami
            </p>
            <p className="mt-1">© 2024 Rami Bot. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AboutPanel
