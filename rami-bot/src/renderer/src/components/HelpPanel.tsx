import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  HelpCircle, Book, Zap, Settings, Bot, Puzzle, MessageSquare,
  Globe, Keyboard, Shield, X, ChevronRight, Search, ExternalLink,
  Play, Code, Terminal, Monitor, Volume2, Bell, Clock, Cloud
} from 'lucide-react'

interface HelpPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface HelpSection {
  id: string
  title: string
  icon: typeof HelpCircle
  content: HelpTopic[]
}

interface HelpTopic {
  title: string
  content: string
  example?: string
}

function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  const { t } = useTranslation()
  const [selectedSection, setSelectedSection] = useState('getting-started')
  const [searchQuery, setSearchQuery] = useState('')

  const helpSections: HelpSection[] = [
    {
      id: 'getting-started',
      title: t('help.gettingStarted', 'Getting Started'),
      icon: Play,
      content: [
        {
          title: 'Welcome to Rami Bot',
          content: `Rami Bot is a powerful autonomous AI assistant that can control your computer, search the web, manage files, and much more. It uses Claude AI to understand your requests and execute them using 45+ built-in tools.`,
        },
        {
          title: 'Initial Setup',
          content: `1. Go to Settings (Ctrl+,)
2. Enter your Claude API key (get it from console.anthropic.com)
3. Enter your Telegram Bot token (get it from @BotFather)
4. Optionally add Tavily API key for web search
5. Click Save

You're now ready to use Rami Bot!`,
        },
        {
          title: 'Your First Command',
          content: `Try sending a message via Telegram to your bot. Here are some examples:
• "What time is it?"
• "Take a screenshot"
• "Search for today's news"
• "Create a file called test.txt on my desktop"`,
        }
      ]
    },
    {
      id: 'features',
      title: t('help.features', 'Features'),
      icon: Zap,
      content: [
        {
          title: '45+ Built-in Tools',
          content: `Rami Bot comes with 45+ tools for full computer control:

📁 **File & Code**
• Execute shell commands (bash)
• Create, read, edit files
• Download files from URLs

🌐 **Web & Search**
• Search the web with Tavily
• Open URLs in browser

🖥️ **System Control**
• Take screenshots
• Mouse control (move, click, scroll)
• Keyboard control (type, keys, hotkeys)
• Window management
• Process management
• Clipboard operations

🎵 **Media Control**
• Play/pause, next, previous
• Volume control
• Brightness control

⚡ **Power Management**
• Shutdown, restart, sleep, lock

🔔 **Notifications**
• Desktop notifications
• Text-to-speech
• Reminders`,
        },
        {
          title: 'Multi-Agent Support',
          content: `Create multiple AI agents with different personalities and skills:

• **Rami** - Main helpful assistant
• **Coder** - Programming expert
• **Researcher** - Web research specialist
• **Assistant** - Personal productivity helper
• **System Admin** - System management expert

Agents can work together on complex tasks through collaboration mode!`,
        },
        {
          title: 'Custom Skills',
          content: `Extend Rami Bot with custom skills:

1. Go to Skills Manager
2. Click "Create Skill"
3. Define name, description, and code
4. Save and use your new skill!

You can also import/export skills to share with others.`,
        },
        {
          title: 'Background Services',
          content: `Create background services that run continuously:

• Monitor websites for changes
• Track stock prices
• Weather alerts
• Custom automation tasks

Services can notify you via Telegram when conditions are met.`,
        }
      ]
    },
    {
      id: 'commands',
      title: t('help.commands', 'Commands'),
      icon: Terminal,
      content: [
        {
          title: 'File Operations',
          content: `• "Create a file called notes.txt with content Hello World"
• "Read the file C:/Users/me/document.txt"
• "Edit the file and replace 'old' with 'new'"
• "Delete the file test.txt"
• "List files in my Documents folder"`,
        },
        {
          title: 'Web & Search',
          content: `• "Search for Python tutorials"
• "What's the latest news about AI?"
• "Download the image from this URL"
• "Open google.com in browser"`,
        },
        {
          title: 'System Control',
          content: `• "Take a screenshot"
• "Open Notepad"
• "Close Chrome"
• "What processes are running?"
• "Kill the process named xyz"
• "What's my system info?"`,
        },
        {
          title: 'Computer Control',
          content: `• "Move mouse to 500, 300"
• "Click at position 100, 200"
• "Type 'Hello World'"
• "Press Enter"
• "Press Ctrl+C"
• "Scroll down"`,
        },
        {
          title: 'Media & Volume',
          content: `• "Play music" / "Pause music"
• "Next track" / "Previous track"
• "Set volume to 50%"
• "Mute" / "Unmute"`,
        },
        {
          title: 'Power & System',
          content: `• "Lock my computer"
• "Put computer to sleep"
• "Shutdown in 10 minutes"
• "Cancel shutdown"
• "Restart computer"`,
        },
        {
          title: 'Notifications & Reminders',
          content: `• "Show a notification saying Meeting in 5 minutes"
• "Remind me in 30 minutes to call John"
• "Say 'Hello' out loud" (text-to-speech)
• "What's the weather in Dubai?"`,
        }
      ]
    },
    {
      id: 'agents',
      title: t('help.agents', 'AI Agents'),
      icon: Bot,
      content: [
        {
          title: 'What are Agents?',
          content: `Agents are specialized AI personalities with specific skills and behaviors. Each agent has:

• **Name** - Unique identifier
• **Personality** - How the agent behaves
• **System Prompt** - Instructions for the AI
• **Skills** - Which tools the agent can use
• **Avatar & Color** - Visual customization`,
        },
        {
          title: 'Creating Agents',
          content: `1. Go to Agents menu or press Ctrl+A
2. Click "Create Agent"
3. Choose an avatar and color
4. Enter name and personality
5. Write a system prompt
6. Select which skills to enable
7. Save`,
        },
        {
          title: 'Agent Collaboration',
          content: `Multiple agents can work together:

1. Enable "Collaborate" mode
2. Select 2 or more agents
3. Enter a task
4. Click "Start"

All selected agents will work on the task simultaneously, bringing their unique perspectives and skills.`,
        }
      ]
    },
    {
      id: 'skills',
      title: t('help.skills', 'Skills'),
      icon: Puzzle,
      content: [
        {
          title: 'Built-in Skills',
          content: `Rami Bot includes 45 built-in skills across categories:

• **File & Code** (5 skills)
• **Web & Search** (2 skills)
• **System** (25 skills)
• **Media** (7 skills)
• **Communication** (4 skills)

All built-in skills are enabled by default but can be toggled off.`,
        },
        {
          title: 'Custom Skills',
          content: `Create your own skills with JavaScript:

\`\`\`javascript
async function execute(input) {
  // Your code here
  return { success: true, data: result }
}
\`\`\`

Custom skills can use Node.js APIs and execute any logic you need.`,
        },
        {
          title: 'Import/Export Skills',
          content: `Share skills with others:

**Export**: Click the download icon on any custom skill
**Import**: Click "Import" and select a .json skill file

Skill files contain all the configuration and code needed.`,
        }
      ]
    },
    {
      id: 'settings',
      title: t('help.settings', 'Settings'),
      icon: Settings,
      content: [
        {
          title: 'API Keys',
          content: `**Claude API Key** (Required)
Get from: console.anthropic.com
Used for: AI processing

**Telegram Bot Token** (Required for Telegram)
Get from: @BotFather on Telegram
Used for: Telegram integration

**Tavily API Key** (Optional)
Get from: tavily.com
Used for: Web search`,
        },
        {
          title: 'Model Settings',
          content: `**Model**: Choose Claude model
• Claude Sonnet 4 - Recommended balance
• Claude Opus 4 - Most capable
• Claude 3.5 Sonnet - Fast and capable

**Max Tokens**: Maximum response length (default: 8192)
**Temperature**: Creativity level 0-1 (default: 0.7)`,
        },
        {
          title: 'Language',
          content: `Rami Bot supports 3 languages:
• 🇺🇸 English
• 🇸🇦 العربية (Arabic) - RTL support
• 🇮🇱 עברית (Hebrew) - RTL support

The interface automatically adjusts for RTL languages.`,
        },
        {
          title: 'System Prompt',
          content: `Add custom instructions that apply to all conversations:

• Personality adjustments
• Response style preferences
• Domain-specific knowledge
• Behavioral guidelines`,
        }
      ]
    },
    {
      id: 'shortcuts',
      title: t('help.shortcuts', 'Keyboard Shortcuts'),
      icon: Keyboard,
      content: [
        {
          title: 'General',
          content: `**Ctrl+,** - Open Settings
**Ctrl+B** - Toggle Sidebar
**Ctrl+N** - New Chat
**Ctrl+S** - Save Chat
**F11** - Toggle Fullscreen
**F12** - Developer Tools`,
        },
        {
          title: 'Navigation',
          content: `**Ctrl+Tab** - Switch Agent
**Ctrl+1-9** - Quick switch to chat 1-9
**Ctrl+W** - Close current chat
**Escape** - Close dialogs`,
        },
        {
          title: 'Chat',
          content: `**Enter** - Send message
**Shift+Enter** - New line
**Ctrl+R** - Regenerate response
**Ctrl+C** - Copy selected text
**Ctrl+V** - Paste`,
        }
      ]
    },
    {
      id: 'platforms',
      title: t('help.platforms', 'Platforms'),
      icon: Globe,
      content: [
        {
          title: 'Telegram',
          content: `**Setup:**
1. Message @BotFather on Telegram
2. Send /newbot and follow instructions
3. Copy the bot token
4. Paste in Rami Bot Settings
5. Save

**Features:**
• Text messages
• Voice messages
• Images
• Documents
• Auto-reply`,
        },
        {
          title: 'WhatsApp (Coming Soon)',
          content: `WhatsApp integration is in development:

• QR code authentication
• Text messages
• Media support
• Group chats`,
        },
        {
          title: 'Discord (Coming Soon)',
          content: `Discord bot integration planned:

• Server commands
• DM support
• Slash commands
• Rich embeds`,
        }
      ]
    }
  ]

  const currentSection = helpSections.find(s => s.id === selectedSection)

  const filteredSections = searchQuery
    ? helpSections.map(section => ({
      ...section,
      content: section.content.filter(topic =>
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(s => s.content.length > 0)
    : helpSections

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-2xl w-[1000px] max-h-[85vh] overflow-hidden shadow-2xl flex">
        {/* Sidebar */}
        <div className="w-72 bg-dark-850 border-r border-dark-700 flex flex-col">
          <div className="p-4 border-b border-dark-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <Book size={24} />
              </div>
              <div>
                <h2 className="font-bold">{t('help.title', 'Help & Documentation')}</h2>
                <p className="text-xs text-dark-400">Rami Bot v5.0</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" size={16} />
              <input
                type="text"
                placeholder={t('help.search', 'Search help...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filteredSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left mb-1 ${selectedSection === section.id
                    ? 'bg-primary-600 text-white'
                    : 'hover:bg-dark-700'
                  }`}
              >
                <section.icon size={18} />
                <span className="flex-1">{section.title}</span>
                {searchQuery && section.content.length > 0 && (
                  <span className="text-xs bg-dark-600 px-2 py-0.5 rounded-full">
                    {section.content.length}
                  </span>
                )}
                <ChevronRight size={16} className="text-dark-500" />
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-dark-700 text-xs text-dark-500">
            <p>Need more help?</p>
            <button onClick={() => window.electron?.openExternal('https://docs.ramibot.app')} className="text-primary-400 hover:underline flex items-center gap-1 mt-1">
              Visit Documentation <ExternalLink size={12} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-dark-700">
            <div className="flex items-center gap-3">
              {currentSection && <currentSection.icon size={24} className="text-primary-400" />}
              <h3 className="text-xl font-bold">{currentSection?.title}</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {currentSection?.content.map((topic, index) => (
              <div key={index} className="mb-8 last:mb-0">
                <h4 className="text-lg font-semibold mb-3 text-primary-300">{topic.title}</h4>
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-dark-200 leading-relaxed">
                    {topic.content}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpPanel
