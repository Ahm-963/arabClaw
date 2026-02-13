# 🤖 Rami Bot v7

**The Ultimate Autonomous AI Assistant with Full Computer Control**

![Version](https://img.shields.io/badge/version-7.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows-green)
![License](https://img.shields.io/badge/license-MIT-purple)

## 🌟 Features

### 🧠 Self-Learning AI
- **Long-term Memory** - Remembers facts, preferences, and learnings
- **Pattern Recognition** - Learns successful approaches for tasks
- **Self-Reflection** - Analyzes successes and failures to improve
- **Confidence Scoring** - Tracks reliability of memories
- **Automatic Extraction** - Learns from natural conversation

### 📄 Document Analysis
- **PDF, Word, Excel, PowerPoint** support
- **RFP/Proposal Analysis** - Extracts requirements, deadlines, scope
- **Entity Extraction** - Dates, money, emails, phones, URLs
- **Document Comparison** - Find similarities and differences
- **Structure Analysis** - Understand document organization

### 🔗 20+ Integrations

#### Development
- **GitHub** - Repos, issues, PRs, search, commits, releases, workflows

#### Payments
- **Stripe** - Customers, payments, subscriptions, invoices, balance

#### Social Media
- **Twitter/X** - Search, users, tweets
- **YouTube** - Videos, channels, search
- **Reddit** - Subreddits, posts, search
- **LinkedIn** - Profile, posts
- **Facebook** - Pages, posts, insights
- **Instagram** - Business accounts, media

#### Productivity
- **Notion** - Databases, pages, search
- **Slack** - Messages, channels
- **Discord** - Servers, messages
- **Trello** - Boards, lists, cards
- **Jira** - Projects, issues
- **Airtable** - Bases, records

#### Cloud Storage
- **Google Drive** - Files, folders
- **Dropbox** - Files, sharing

### 🔊 Voice Control
- **Text-to-Speech** - Multiple voices, adjustable speed and volume
- **Speech Recognition** - Listen and transcribe
- **Save to Audio** - Export speech to files
- **Read Clipboard** - Speak clipboard content

### 🖥️ Full Computer Control
- Mouse control (move, click, scroll)
- Keyboard control (type, keys, hotkeys)
- Screenshot capture
- Window management
- Process management
- Clipboard operations
- Power control (shutdown, restart, sleep, lock)

### 🎵 Media Control
- Play/pause, next, previous
- Volume control
- Mute/unmute

### 📊 System Information
- System specs (OS, CPU, RAM)
- Disk space
- Network info
- Battery status
- Weather
- Current time

### 🔔 Notifications & Reminders
- Desktop notifications
- Text-to-speech alerts
- Timed reminders

### 🤖 Multi-Agent System
- Create multiple AI agents with different personalities
- Agent collaboration on complex tasks
- Specialized agents (Coder, Researcher, Assistant, etc.)

### 🧩 Extensible Skills
- Import/export custom skills
- Enable/disable tools
- Create your own skills with JavaScript

### 🌐 Multi-Language Support
- English 🇺🇸
- Arabic 🇸🇦 (RTL)
- Hebrew 🇮🇱 (RTL)

### 📱 Platform Integrations
- **Telegram** - Full bot integration
- **WhatsApp** - Coming soon

## 🛠️ 80+ Tools

| Category | Tools |
|----------|-------|
| Document Analysis | 3 tools |
| GitHub | 6 tools |
| Stripe | 5 tools |
| Social Media | 6 tools |
| Productivity | 8 tools |
| Memory & Learning | 4 tools |
| Voice & Speech | 6 tools |
| File Operations | 5 tools |
| Web & Search | 2 tools |
| System Control | 25 tools |
| Media Control | 7 tools |
| Notifications | 4 tools |

## 🚀 Getting Started

### Installation
1. Download `Rami Bot-1.0.0-Setup.exe`
2. Run the installer
3. Launch Rami Bot

### Configuration
1. Open Settings (Ctrl+,)
2. Add your API keys:
   - **Claude API Key** (required) - Get from [console.anthropic.com](https://console.anthropic.com)
   - **Telegram Bot Token** - Get from [@BotFather](https://t.me/BotFather)
   - **Tavily API Key** - For web search
3. Configure integrations as needed
4. Save settings

### Usage Examples

#### Document Analysis
```
"Analyze the RFP document on my desktop"
"Extract all requirements from proposal.pdf"
"Compare contract-v1.docx with contract-v2.docx"
```

#### GitHub
```
"List my GitHub repos"
"Create a new repo called my-project"
"Show open issues in owner/repo"
```

#### Learning
```
"My name is John"
"Remember that I prefer dark mode"
"What do you know about me?"
```

#### Voice
```
"Say hello out loud"
"Read my clipboard"
"List available voices"
```

#### System Control
```
"Take a screenshot"
"Open Chrome"
"Set volume to 50%"
"Lock my computer"
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+, | Settings |
| F1 | Help |
| F12 | Developer Tools |
| Ctrl+B | Toggle Sidebar |
| Escape | Close Panels |

## 📁 Project Structure

```
rami-bot/
├── src/
│   ├── main/
│   │   ├── tools/          # 11 tool modules
│   │   ├── integrations/   # 4 integration modules
│   │   ├── learning/       # Self-learning system
│   │   ├── platforms/      # Telegram, WhatsApp
│   │   ├── services/       # Background services
│   │   ├── llm/           # Claude AI agent
│   │   └── index.ts       # Main process
│   ├── preload/
│   │   └── index.ts       # IPC bridge
│   └── renderer/
│       └── src/
│           ├── components/ # 13 UI components
│           ├── stores/     # State management
│           └── i18n/       # Translations
├── package.json
└── README.md
```

## 🔧 Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Build
```bash
cd rami-bot
npm install
npm run build
```

### Run Development
```bash
npm run dev
```

### Create Installer
```bash
npx electron-builder --win nsis
```

## 📝 License

MIT License

## 👨‍💻 Author

Dr. Rami

---

**🔥 Rami Bot - The Most Powerful AI Assistant! 🔥**
