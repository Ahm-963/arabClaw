import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plug, Github, CreditCard, Twitter, Linkedin, Facebook,
  Youtube, Instagram, MessageCircle, Cloud, Database,
  Trello, Slack, X, Check, ExternalLink, Key, Eye, EyeOff,
  RefreshCw, AlertCircle, CheckCircle, Settings, Zap
} from 'lucide-react'

interface Integration {
  id: string
  name: string
  icon: any
  color: string
  description: string
  configKeys: { key: string; label: string; type: 'text' | 'password'; placeholder: string }[]
  docsUrl: string
  category: 'development' | 'payments' | 'social' | 'productivity' | 'cloud'
}

const INTEGRATIONS: Integration[] = [
  // Development
  {
    id: 'github',
    name: 'GitHub',
    icon: Github,
    color: '#333',
    description: 'Manage repositories, issues, PRs, and more',
    configKeys: [
      { key: 'githubToken', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_xxxxxxxxxxxx' }
    ],
    docsUrl: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens',
    category: 'development'
  },

  // Payments
  {
    id: 'stripe',
    name: 'Stripe',
    icon: CreditCard,
    color: '#635BFF',
    description: 'Payment processing, subscriptions, invoices',
    configKeys: [
      { key: 'stripeSecretKey', label: 'Secret Key', type: 'password', placeholder: 'sk_live_xxxx or sk_test_xxxx' }
    ],
    docsUrl: 'https://stripe.com/docs/keys',
    category: 'payments'
  },

  // Social Media
  {
    id: 'twitter',
    name: 'Twitter / X',
    icon: Twitter,
    color: '#1DA1F2',
    description: 'Post tweets, search, get user info',
    configKeys: [
      { key: 'twitterBearerToken', label: 'Bearer Token', type: 'password', placeholder: 'AAAAAxxxxxxxxx' }
    ],
    docsUrl: 'https://developer.twitter.com/en/docs/authentication',
    category: 'social'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: '#0A66C2',
    description: 'Profile, posts, connections',
    configKeys: [
      { key: 'linkedinAccessToken', label: 'Access Token', type: 'password', placeholder: 'Access token from OAuth' }
    ],
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/shared/authentication/',
    category: 'social'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: '#1877F2',
    description: 'Pages, posts, insights',
    configKeys: [
      { key: 'facebookAccessToken', label: 'Page Access Token', type: 'password', placeholder: 'EAAxxxxxxxxx' }
    ],
    docsUrl: 'https://developers.facebook.com/docs/pages/access-tokens',
    category: 'social'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: '#FF0000',
    description: 'Search videos, channels, comments',
    configKeys: [
      { key: 'googleApiKey', label: 'Google API Key', type: 'password', placeholder: 'AIzaSyxxxxxxxxx' }
    ],
    docsUrl: 'https://developers.google.com/youtube/v3/getting-started',
    category: 'social'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: '#E4405F',
    description: 'Business accounts, posts, insights',
    configKeys: [
      { key: 'facebookAccessToken', label: 'Facebook Page Token (for Instagram)', type: 'password', placeholder: 'Uses Facebook token' }
    ],
    docsUrl: 'https://developers.facebook.com/docs/instagram-api/',
    category: 'social'
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: MessageCircle,
    color: '#FF4500',
    description: 'Subreddits, posts, search',
    configKeys: [
      { key: 'redditClientId', label: 'Client ID', type: 'text', placeholder: 'Your app client ID' },
      { key: 'redditClientSecret', label: 'Client Secret', type: 'password', placeholder: 'Your app client secret' }
    ],
    docsUrl: 'https://www.reddit.com/wiki/api/',
    category: 'social'
  },

  // Productivity
  {
    id: 'slack',
    name: 'Slack',
    icon: Slack,
    color: '#4A154B',
    description: 'Messages, channels, users',
    configKeys: [
      { key: 'slackToken', label: 'Bot Token', type: 'password', placeholder: 'xoxb-xxxxxxxxxxxx' }
    ],
    docsUrl: 'https://api.slack.com/authentication/token-types',
    category: 'productivity'
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: MessageCircle,
    color: '#5865F2',
    description: 'Servers, channels, messages',
    configKeys: [
      { key: 'discordBotToken', label: 'Bot Token', type: 'password', placeholder: 'MTxxxxxxxxx.xxxxx' }
    ],
    docsUrl: 'https://discord.com/developers/docs/intro',
    category: 'productivity'
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: Database,
    color: '#000000',
    description: 'Databases, pages, blocks',
    configKeys: [
      { key: 'notionToken', label: 'Integration Token', type: 'password', placeholder: 'secret_xxxxxxxxxxxx' }
    ],
    docsUrl: 'https://developers.notion.com/docs/getting-started',
    category: 'productivity'
  },
  {
    id: 'trello',
    name: 'Trello',
    icon: Trello,
    color: '#0052CC',
    description: 'Boards, lists, cards',
    configKeys: [
      { key: 'trelloApiKey', label: 'API Key', type: 'text', placeholder: 'Your API key' },
      { key: 'trelloToken', label: 'Token', type: 'password', placeholder: 'Your token' }
    ],
    docsUrl: 'https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/',
    category: 'productivity'
  },
  {
    id: 'jira',
    name: 'Jira',
    icon: Database,
    color: '#0052CC',
    description: 'Projects, issues, sprints',
    configKeys: [
      { key: 'jiraDomain', label: 'Domain', type: 'text', placeholder: 'your-domain (without .atlassian.net)' },
      { key: 'jiraEmail', label: 'Email', type: 'text', placeholder: 'your@email.com' },
      { key: 'jiraApiToken', label: 'API Token', type: 'password', placeholder: 'Your API token' }
    ],
    docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/',
    category: 'productivity'
  },
  {
    id: 'airtable',
    name: 'Airtable',
    icon: Database,
    color: '#18BFFF',
    description: 'Bases, tables, records',
    configKeys: [
      { key: 'airtableApiKey', label: 'Personal Access Token', type: 'password', placeholder: 'patxxxxxxxxxx' }
    ],
    docsUrl: 'https://airtable.com/developers/web/api/introduction',
    category: 'productivity'
  },

  // Cloud
  {
    id: 'google-drive',
    name: 'Google Drive',
    icon: Cloud,
    color: '#4285F4',
    description: 'Files, folders, sharing',
    configKeys: [
      { key: 'googleAccessToken', label: 'Access Token', type: 'password', placeholder: 'OAuth access token' }
    ],
    docsUrl: 'https://developers.google.com/drive/api/guides/about-sdk',
    category: 'cloud'
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    icon: Cloud,
    color: '#0061FF',
    description: 'Files, folders, sharing',
    configKeys: [
      { key: 'dropboxAccessToken', label: 'Access Token', type: 'password', placeholder: 'Your access token' }
    ],
    docsUrl: 'https://www.dropbox.com/developers/documentation',
    category: 'cloud'
  },

  // Messaging (New)
  {
    id: 'signal',
    name: 'Signal',
    icon: MessageCircle,
    color: '#3A76F0',
    description: 'Secure messaging with Signal-cli',
    configKeys: [
      { key: 'signalCliPath', label: 'Signal-cli Path', type: 'text', placeholder: '/usr/local/bin/signal-cli' }
    ],
    docsUrl: 'https://github.com/AsamK/signal-cli',
    category: 'productivity'
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    icon: MessageCircle,
    color: '#6264A7',
    description: 'Corporate collaboration and chat',
    configKeys: [
      { key: 'teamsAppId', label: 'App ID', type: 'text', placeholder: 'xxxx-xxxx-xxxx' },
      { key: 'teamsTenantId', label: 'Tenant ID', type: 'text', placeholder: 'xxxx-xxxx-xxxx' }
    ],
    docsUrl: 'https://learn.microsoft.com/en-us/microsoftteams/platform/',
    category: 'productivity'
  },
  {
    id: 'matrix',
    name: 'Matrix (Element)',
    icon: MessageCircle,
    color: '#000000',
    description: 'Decentralized and encrypted chat',
    configKeys: [
      { key: 'matrixHomeserver', label: 'Homeserver URL', type: 'text', placeholder: 'https://matrix.org' },
      { key: 'matrixAccessToken', label: 'Access Token', type: 'password', placeholder: 'syt_xxxxxxxx' }
    ],
    docsUrl: 'https://matrix.org/docs/api/',
    category: 'social'
  },
  {
    id: 'imessage',
    name: 'iMessage (BlueBubbles)',
    icon: MessageCircle,
    color: '#5AC8FA',
    description: 'Apple iMessage via BlueBubbles server',
    configKeys: [
      { key: 'bluebubblesServerUrl', label: 'Server URL', type: 'text', placeholder: 'https://xxxx.ngrok.io' },
      { key: 'bluebubblesPassword', label: 'Server Password', type: 'password', placeholder: 'Your server password' }
    ],
    docsUrl: 'https://bluebubbles.app/docs/',
    category: 'social'
  },

  // AI & Vision
  {
    id: 'deepcode',
    name: 'DeepCode (Paper2Code)',
    icon: Zap,
    color: '#8B5CF6',
    description: 'Protocol for transforming research papers into implementation blocks',
    configKeys: [],
    docsUrl: 'https://github.com/HKUDS/DeepCode',
    category: 'development'
  },
  {
    id: 'nanobanna',
    name: 'NanoBanna',
    icon: Zap,
    color: '#F97316',
    description: 'Visual content & slide generation model',
    configKeys: [
      { key: 'nanoBannaApiKey', label: 'API Key', type: 'password', placeholder: 'nb_....' }
    ],
    docsUrl: 'https://github.com/openclaw/openclaw',
    category: 'development'
  }
]

interface IntegrationsPanelProps {
  isOpen: boolean
  onClose: () => void
}

function IntegrationsPanel({ isOpen, onClose }: IntegrationsPanelProps) {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({})

  useEffect(() => {
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])

  const loadSettings = async () => {
    try {
      const loaded = await window.electron?.loadSettings()
      if (loaded) setSettings(loaded)
    } catch (e) { }
  }

  const saveSettings = async (key: string, value: string) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    try {
      await window.electron?.saveSettings({ [key]: value })
    } catch (e) { }
  }

  const togglePasswordVisibility = (key: string) => {
    const newSet = new Set(showPasswords)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setShowPasswords(newSet)
  }

  const testIntegration = async (integration: Integration) => {
    setTestingIntegration(integration.id)
    setTestResults({ ...testResults, [integration.id]: null })

    try {
      // Simple test - just check if token is set
      const hasAllKeys = integration.configKeys.every(k => settings[k.key]?.trim())

      if (hasAllKeys) {
        // Try to make a basic API call
        const result = await window.electron?.testIntegration(integration.id)
        setTestResults({ ...testResults, [integration.id]: result?.success ? 'success' : 'error' })
      } else {
        setTestResults({ ...testResults, [integration.id]: 'error' })
      }
    } catch (e) {
      setTestResults({ ...testResults, [integration.id]: 'error' })
    } finally {
      setTestingIntegration(null)
    }
  }

  const categories = [
    { id: 'all', name: 'All', icon: Plug },
    { id: 'development', name: 'Development', icon: Github },
    { id: 'payments', name: 'Payments', icon: CreditCard },
    { id: 'social', name: 'Social Media', icon: Twitter },
    { id: 'productivity', name: 'Productivity', icon: Trello },
    { id: 'cloud', name: 'Cloud Storage', icon: Cloud }
  ]

  const filteredIntegrations = selectedCategory === 'all'
    ? INTEGRATIONS
    : INTEGRATIONS.filter(i => i.category === selectedCategory)

  const getConnectionStatus = (integration: Integration): 'connected' | 'partial' | 'disconnected' => {
    const filledKeys = integration.configKeys.filter(k => settings[k.key]?.trim())
    if (filledKeys.length === 0) return 'disconnected'
    if (filledKeys.length === integration.configKeys.length) return 'connected'
    return 'partial'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-2xl w-[1000px] max-h-[85vh] overflow-hidden shadow-2xl flex">
        {/* Sidebar */}
        <div className="w-64 bg-dark-850 border-r border-dark-700 p-4">
          <h3 className="text-sm font-semibold text-dark-400 uppercase mb-4">
            {t('integrations.categories', 'Categories')}
          </h3>
          <div className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${selectedCategory === cat.id
                  ? 'bg-primary-600 text-white'
                  : 'hover:bg-dark-700'
                  }`}
              >
                <cat.icon size={18} />
                <span>{cat.name}</span>
                <span className="ml-auto text-xs bg-dark-600 px-2 py-0.5 rounded-full">
                  {cat.id === 'all'
                    ? INTEGRATIONS.length
                    : INTEGRATIONS.filter(i => i.category === cat.id).length}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-dark-700">
            <div className="text-sm text-dark-400 mb-2">{t('integrations.status', 'Status')}</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-dark-300">
                  {INTEGRATIONS.filter(i => getConnectionStatus(i) === 'connected').length} Connected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-dark-300">
                  {INTEGRATIONS.filter(i => getConnectionStatus(i) === 'partial').length} Partial
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-dark-500" />
                <span className="text-dark-300">
                  {INTEGRATIONS.filter(i => getConnectionStatus(i) === 'disconnected').length} Not configured
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Plug size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t('integrations.title', 'Integrations')}</h2>
                <p className="text-sm text-dark-400">{t('integrations.subtitle', 'Connect external services and APIs')}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg">
              <X size={20} />
            </button>
          </div>

          {/* Integrations Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {filteredIntegrations.map((integration) => {
                const status = getConnectionStatus(integration)
                const testResult = testResults[integration.id]

                return (
                  <div
                    key={integration.id}
                    className="bg-dark-750 rounded-xl p-4 border border-dark-600"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: integration.color + '20' }}
                      >
                        <integration.icon size={24} style={{ color: integration.color }} />
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{integration.name}</h4>
                          <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' :
                            status === 'partial' ? 'bg-yellow-500' : 'bg-dark-500'
                            }`} />
                          {testResult === 'success' && <CheckCircle size={16} className="text-green-500" />}
                          {testResult === 'error' && <AlertCircle size={16} className="text-red-500" />}
                        </div>
                        <p className="text-sm text-dark-400 mt-1">{integration.description}</p>

                        {/* Config Fields */}
                        <div className="mt-4 space-y-3">
                          {integration.configKeys.map((configKey) => (
                            <div key={configKey.key}>
                              <label className="text-xs text-dark-500 mb-1 block">{configKey.label}</label>
                              <div className="flex gap-2">
                                <div className="flex-1 relative">
                                  <input
                                    type={configKey.type === 'password' && !showPasswords.has(configKey.key) ? 'password' : 'text'}
                                    value={settings[configKey.key] || ''}
                                    onChange={(e) => saveSettings(configKey.key, e.target.value)}
                                    placeholder={configKey.placeholder}
                                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  />
                                  {configKey.type === 'password' && (
                                    <button
                                      onClick={() => togglePasswordVisibility(configKey.key)}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
                                    >
                                      {showPasswords.has(configKey.key) ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-4">
                          <button
                            onClick={() => testIntegration(integration)}
                            disabled={testingIntegration === integration.id}
                            className="px-3 py-1.5 bg-dark-600 hover:bg-dark-500 disabled:opacity-50 rounded-lg text-sm flex items-center gap-2 transition-colors"
                          >
                            {testingIntegration === integration.id ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                            {t('integrations.test', 'Test')}
                          </button>
                          <a
                            href={integration.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-dark-600 hover:bg-dark-500 rounded-lg text-sm flex items-center gap-2 transition-colors"
                          >
                            <ExternalLink size={14} />
                            {t('integrations.docs', 'Docs')}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IntegrationsPanel
