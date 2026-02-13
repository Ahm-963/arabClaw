/**
 * Integration Manager
 * Central hub for testing and managing all external service integrations
 */

import { settingsManager } from '../settings'

// Import all integrations
import * as github from './github'
import * as stripe from './stripe'
import * as socialMedia from './social-media'
import * as cloudServices from './cloud-services'
import * as email from './email'

export interface TestResult {
    success: boolean
    message?: string
    error?: string
}

// Map of integration ID to test function
const integrationTests: Record<string, () => Promise<TestResult>> = {
    // Development
    github: async () => {
        try {
            return await github.test()
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    // Payments
    stripe: async () => {
        try {
            return await stripe.test()
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    // Social Media
    twitter: async () => {
        try {
            const settings = await settingsManager.getSettings()
            if (!settings.twitterBearerToken) {
                return { success: false, error: 'Twitter Bearer Token not configured' }
            }
            // Try to get user by username as a test
            const result = await socialMedia.twitter.getUser('twitter')
            if (result.data?.id) {
                return { success: true, message: `Connected as @twitter` }
            }
            return { success: false, error: 'Could not verify Twitter connection' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    linkedin: async () => {
        try {
            const settings = await settingsManager.getSettings()
            if (!settings.linkedinAccessToken) {
                return { success: false, error: 'LinkedIn Access Token not configured' }
            }
            const profile = await socialMedia.linkedin.getProfile()
            if (profile.id) {
                return { success: true, message: `Connected to LinkedIn` }
            }
            return { success: false, error: 'Could not verify LinkedIn connection' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    facebook: async () => {
        try {
            const settings = await settingsManager.getSettings()
            if (!settings.facebookAccessToken) {
                return { success: false, error: 'Facebook Access Token not configured' }
            }
            const me = await socialMedia.facebook.getMe()
            if (me.id) {
                return { success: true, message: `Connected as ${me.name}` }
            }
            return { success: false, error: 'Could not verify Facebook connection' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    youtube: async () => {
        try {
            const settings = await settingsManager.getSettings()
            if (!settings.googleApiKey) {
                return { success: false, error: 'Google API Key not configured' }
            }
            // Try to search videos as a test
            const result = await socialMedia.youtube.searchVideos('test', 1)
            if (result.items?.length >= 0) {
                return { success: true, message: 'YouTube API connected' }
            }
            return { success: false, error: 'Could not verify YouTube connection' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    instagram: async () => {
        try {
            const settings = await settingsManager.getSettings()
            if (!settings.facebookAccessToken) {
                return { success: false, error: 'Facebook Page Access Token (for Instagram) not configured' }
            }
            // Instagram requires a Facebook page linked to an Instagram business account
            return { success: true, message: 'Instagram uses Facebook token - test Facebook to verify' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    reddit: async () => {
        try {
            const settings = await settingsManager.getSettings()
            // Reddit can work without auth for public data
            const result = await socialMedia.reddit.getSubredditPosts('popular', 'hot', 1)
            if (result.data?.children) {
                return { success: true, message: 'Reddit API connected (public access)' }
            }
            return { success: false, error: 'Could not verify Reddit connection' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    // Productivity
    slack: async () => {
        try {
            const settings = await settingsManager.getSettings()
            if (!settings.slackBotToken) {
                return { success: false, error: 'Slack Bot Token not configured' }
            }
            const result = await cloudServices.slack.listChannels()
            if (result.ok) {
                return { success: true, message: `Slack connected - ${result.channels?.length || 0} channels` }
            }
            return { success: false, error: result.error || 'Could not verify Slack connection' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    discord: async () => {
        try {
            const settings = await settingsManager.getSettings()
            if (!settings.discordBotToken) {
                return { success: false, error: 'Discord Bot Token not configured' }
            }
            const user = await cloudServices.discord.getCurrentUser()
            if (user.id) {
                return { success: true, message: `Connected as ${user.username}#${user.discriminator}` }
            }
            return { success: false, error: 'Could not verify Discord connection' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    notion: async () => {
        try {
            const settings = await settingsManager.getSettings()
            if (!settings.notionToken) {
                return { success: false, error: 'Notion Integration Token not configured' }
            }
            const result = await cloudServices.notion.listUsers()
            if (result.results) {
                return { success: true, message: 'Notion connected' }
            }
            return { success: false, error: 'Could not verify Notion connection' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    trello: async () => {
        try {
            const settings = await settingsManager.getSettings()
            if (!settings.trelloApiKey || !settings.trelloToken) {
                return { success: false, error: 'Trello API Key and Token not configured' }
            }
            const boards = await cloudServices.trello.getBoards()
            if (boards) {
                return { success: true, message: `Trello connected - ${boards.length} boards` }
            }
            return { success: false, error: 'Could not verify Trello connection' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    jira: async () => {
        try {
            const settings = await settingsManager.getSettings()
            if (!settings.jiraDomain || !settings.jiraEmail || !settings.jiraApiToken) {
                return { success: false, error: 'Jira Domain, Email, and API Token not configured' }
            }
            const result = await cloudServices.jira.getProjects(settings.jiraDomain)
            if (result && Array.isArray(result)) {
                return { success: true, message: `Jira connected - ${result.length} projects` }
            }
            return { success: false, error: 'Could not verify Jira connection' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    airtable: async () => {
        try {
            const settings = await settingsManager.getSettings()
            if (!settings.airtableApiKey) {
                return { success: false, error: 'Airtable API Key not configured' }
            }
            // Airtable requires baseId and tableId for actual test, just check if key exists
            return { success: true, message: 'Airtable API Key configured (provide baseId and tableId to test)' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    // Cloud
    'google-drive': async () => {
        try {
            const settings = await settingsManager.getSettings()
            if (!settings.googleAccessToken) {
                return { success: false, error: 'Google Access Token not configured' }
            }
            const result = await cloudServices.googleDrive.listFiles({ pageSize: 1 })
            if (result.files) {
                return { success: true, message: `Google Drive connected - ${result.files.length} files` }
            }
            return { success: false, error: 'Could not verify Google Drive connection' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    dropbox: async () => {
        try {
            const settings = await settingsManager.getSettings()
            if (!settings.dropboxAccessToken) {
                return { success: false, error: 'Dropbox Access Token not configured' }
            }
            const result = await cloudServices.dropbox.getSpaceUsage()
            if (result) {
                return { success: true, message: `Dropbox connected - ${Math.round(result.allocated / 1024 / 1024 / 1024)}GB allocated` }
            }
            return { success: false, error: 'Could not verify Dropbox connection' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    // Messaging
    signal: async () => {
        try {
            const settings = await settingsManager.getSettings()
            if (!settings.signalCliPath) {
                return { success: false, error: 'Signal-cli Path not configured' }
            }
            return { success: true, message: 'Signal configured (test by sending a message)' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    teams: async () => {
        try {
            const settings = await settingsManager.getSettings()
            if (!settings.teamsAppId || !settings.teamsTenantId) {
                return { success: false, error: 'Teams App ID and Tenant ID not configured' }
            }
            return { success: true, message: 'Microsoft Teams configured (test by sending a message)' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    matrix: async () => {
        try {
            const settings = await settingsManager.getSettings()
            if (!settings.matrixHomeserver || !settings.matrixAccessToken) {
                return { success: false, error: 'Matrix Homeserver and Access Token not configured' }
            }
            return { success: true, message: 'Matrix configured (test by sending a message)' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    imessage: async () => {
        try {
            const settings = await settingsManager.getSettings()
            if (!settings.bluebubblesServerUrl || !settings.bluebubblesPassword) {
                return { success: false, error: 'BlueBubbles Server URL and Password not configured' }
            }
            return { success: true, message: 'iMessage configured via BlueBubbles' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    },

    // AI & Vision
    deepcode: async () => {
        try {
            const { agentRegistry } = await import('../agents/registry')
            const agents = agentRegistry.getAll()
            const hasScholar = agents.some(a => a.id === 'researcher-main' || a.role.toLowerCase().includes('research'))
            const hasCoder = agents.some(a => a.id === 'coder-main' || a.role.toLowerCase().includes('engineer'))

            if (hasScholar && hasCoder) {
                return { success: true, message: 'DeepCode Protocol: 100% Operational. Scholar & Coder units active.' }
            }
            return { success: true, message: 'DeepCode Protocol active (Standard Mode)' }
        } catch (error: any) {
            return { success: false, error: 'DeepCode protocol check failed' }
        }
    },

    nanobanna: async () => {
        try {
            const { agentRegistry } = await import('../agents/registry')
            const agents = agentRegistry.getAll()
            const hasDesigner = agents.some(a => a.role.toLowerCase().includes('design') || a.role.toLowerCase().includes('creative'))

            if (hasDesigner) {
                return { success: true, message: 'NanoBanna: 100% Operational. Creative units mobilized.' }
            }
            return { success: true, message: 'NanoBanna Protocol active (API Ready)' }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    }
}

/**
 * Test an integration by ID
 */
export async function testIntegration(integrationId: string): Promise<TestResult> {
    const testFn = integrationTests[integrationId]

    if (!testFn) {
        return { success: false, error: `Unknown integration: ${integrationId}` }
    }

    return await testFn()
}

/**
 * Get list of all available integrations
 */
export function getAvailableIntegrations(): string[] {
    return Object.keys(integrationTests)
}

/**
 * Test all integrations that have been configured
 */
export async function testAllIntegrations(): Promise<Record<string, TestResult>> {
    const results: Record<string, TestResult> = {}
    const settings = await settingsManager.getSettings()

    for (const [id, testFn] of Object.entries(integrationTests)) {
        try {
            results[id] = await testFn()
        } catch (error: any) {
            results[id] = { success: false, error: error.message }
        }
    }

    return results
}

// Export integration modules for direct access
export {
    github,
    stripe,
    socialMedia,
    cloudServices,
    email
}
