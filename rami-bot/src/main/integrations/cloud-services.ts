/**
 * Cloud Services Integrations
 * Google Drive, Dropbox, OneDrive, AWS S3, Notion, Airtable, Slack, Discord
 */

import { settingsManager } from '../settings'

// ============ GOOGLE DRIVE ============

const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3'

async function googleDriveRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
  const settings = await settingsManager.getSettings()
  const accessToken = settings.googleAccessToken

  if (!accessToken) {
    throw new Error('Google Access Token not configured')
  }

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  }

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data)
  }

  const response = await fetch(`${GOOGLE_DRIVE_API}${endpoint}`, options)
  return response.json()
}

export const googleDrive = {
  async listFiles(options?: { q?: string; pageSize?: number; fields?: string }) {
    const params = new URLSearchParams()
    if (options?.q) params.set('q', options.q)
    if (options?.pageSize) params.set('pageSize', options.pageSize.toString())
    params.set('fields', options?.fields || 'files(id,name,mimeType,size,modifiedTime,webViewLink)')
    return await googleDriveRequest(`/files?${params}`)
  },

  async getFile(fileId: string) {
    return await googleDriveRequest(`/files/${fileId}?fields=id,name,mimeType,size,modifiedTime,webViewLink,parents`)
  },

  async createFolder(name: string, parentId?: string) {
    return await googleDriveRequest('/files', 'POST', {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined
    })
  },

  async deleteFile(fileId: string) {
    return await googleDriveRequest(`/files/${fileId}`, 'DELETE')
  },

  async moveFile(fileId: string, newParentId: string, oldParentId: string) {
    return await googleDriveRequest(`/files/${fileId}?addParents=${newParentId}&removeParents=${oldParentId}`, 'PATCH')
  },

  async searchFiles(query: string) {
    return await this.listFiles({ q: `name contains '${query}'` })
  }
}

// ============ DROPBOX ============

const DROPBOX_API = 'https://api.dropboxapi.com/2'
const DROPBOX_CONTENT_API = 'https://content.dropboxapi.com/2'

async function dropboxRequest(endpoint: string, data?: any, isContent: boolean = false): Promise<any> {
  const settings = await settingsManager.getSettings()
  const accessToken = settings.dropboxAccessToken

  if (!accessToken) {
    throw new Error('Dropbox Access Token not configured')
  }

  const baseUrl = isContent ? DROPBOX_CONTENT_API : DROPBOX_API

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : undefined
  })

  return response.json()
}

export const dropbox = {
  async listFolder(path: string = '') {
    return await dropboxRequest('/files/list_folder', { path: path || '' })
  },

  async getMetadata(path: string) {
    return await dropboxRequest('/files/get_metadata', { path })
  },

  async createFolder(path: string) {
    return await dropboxRequest('/files/create_folder_v2', { path })
  },

  async deleteFile(path: string) {
    return await dropboxRequest('/files/delete_v2', { path })
  },

  async moveFile(fromPath: string, toPath: string) {
    return await dropboxRequest('/files/move_v2', { from_path: fromPath, to_path: toPath })
  },

  async copyFile(fromPath: string, toPath: string) {
    return await dropboxRequest('/files/copy_v2', { from_path: fromPath, to_path: toPath })
  },

  async search(query: string) {
    return await dropboxRequest('/files/search_v2', { query })
  },

  async getSharedLink(path: string) {
    return await dropboxRequest('/sharing/create_shared_link_with_settings', { path })
  },

  async getSpaceUsage() {
    return await dropboxRequest('/users/get_space_usage')
  }
}

// ============ NOTION ============

const NOTION_API = 'https://api.notion.com/v1'

async function notionRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
  const settings = await settingsManager.getSettings()
  const token = settings.notionToken

  if (!token) {
    throw new Error('Notion Token not configured')
  }

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    }
  }

  if (data) {
    options.body = JSON.stringify(data)
  }

  const response = await fetch(`${NOTION_API}${endpoint}`, options)
  return response.json()
}

export const notion = {
  async listDatabases() {
    return await notionRequest('/search', 'POST', {
      filter: { property: 'object', value: 'database' }
    })
  },

  async getDatabase(databaseId: string) {
    return await notionRequest(`/databases/${databaseId}`)
  },

  async queryDatabase(databaseId: string, filter?: any, sorts?: any[]) {
    return await notionRequest(`/databases/${databaseId}/query`, 'POST', { filter, sorts })
  },

  async createPage(parentId: string, properties: Record<string, any>, children?: any[]) {
    return await notionRequest('/pages', 'POST', {
      parent: { database_id: parentId },
      properties,
      children
    })
  },

  async getPage(pageId: string) {
    return await notionRequest(`/pages/${pageId}`)
  },

  async updatePage(pageId: string, properties: Record<string, any>) {
    return await notionRequest(`/pages/${pageId}`, 'PATCH', { properties })
  },

  async getBlockChildren(blockId: string) {
    return await notionRequest(`/blocks/${blockId}/children`)
  },

  async appendBlockChildren(blockId: string, children: any[]) {
    return await notionRequest(`/blocks/${blockId}/children`, 'PATCH', { children })
  },

  async search(query: string) {
    return await notionRequest('/search', 'POST', { query })
  },

  async getUser(userId: string) {
    return await notionRequest(`/users/${userId}`)
  },

  async listUsers() {
    return await notionRequest('/users')
  }
}

// ============ AIRTABLE ============

const AIRTABLE_API = 'https://api.airtable.com/v0'

async function airtableRequest(baseId: string, endpoint: string, method: string = 'GET', data?: any): Promise<any> {
  const settings = await settingsManager.getSettings()
  const apiKey = settings.airtableApiKey

  if (!apiKey) {
    throw new Error('Airtable API Key not configured')
  }

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  }

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data)
  }

  const response = await fetch(`${AIRTABLE_API}/${baseId}${endpoint}`, options)
  return response.json()
}

export const airtable = {
  async listRecords(baseId: string, tableId: string, options?: { maxRecords?: number; view?: string }) {
    const params = new URLSearchParams()
    if (options?.maxRecords) params.set('maxRecords', options.maxRecords.toString())
    if (options?.view) params.set('view', options.view)
    return await airtableRequest(baseId, `/${tableId}?${params}`)
  },

  async getRecord(baseId: string, tableId: string, recordId: string) {
    return await airtableRequest(baseId, `/${tableId}/${recordId}`)
  },

  async createRecord(baseId: string, tableId: string, fields: Record<string, any>) {
    return await airtableRequest(baseId, `/${tableId}`, 'POST', { fields })
  },

  async updateRecord(baseId: string, tableId: string, recordId: string, fields: Record<string, any>) {
    return await airtableRequest(baseId, `/${tableId}/${recordId}`, 'PATCH', { fields })
  },

  async deleteRecord(baseId: string, tableId: string, recordId: string) {
    return await airtableRequest(baseId, `/${tableId}/${recordId}`, 'DELETE')
  },

  async createRecords(baseId: string, tableId: string, records: Array<{ fields: Record<string, any> }>) {
    return await airtableRequest(baseId, `/${tableId}`, 'POST', { records })
  }
}

// ============ SLACK ============

const SLACK_API = 'https://slack.com/api'

async function slackRequest(endpoint: string, data?: Record<string, any>): Promise<any> {
  const settings = await settingsManager.getSettings()
  const token = settings.slackBotToken

  if (!token) {
    throw new Error('Slack Token not configured')
  }

  const formData = new URLSearchParams()
  formData.set('token', token)
  if (data) {
    Object.entries(data).forEach(([key, value]) => {
      formData.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
    })
  }

  const response = await fetch(`${SLACK_API}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData
  })

  return response.json()
}

export const slack = {
  async postMessage(channel: string, text: string, options?: { blocks?: any[]; thread_ts?: string }) {
    return await slackRequest('chat.postMessage', { channel, text, ...options })
  },

  async listChannels() {
    return await slackRequest('conversations.list')
  },

  async getChannelHistory(channel: string, limit: number = 100) {
    return await slackRequest('conversations.history', { channel, limit })
  },

  async getUser(userId: string) {
    return await slackRequest('users.info', { user: userId })
  },

  async listUsers() {
    return await slackRequest('users.list')
  },

  async uploadFile(channels: string, content: string, filename: string, title?: string) {
    return await slackRequest('files.upload', { channels, content, filename, title })
  },

  async addReaction(channel: string, timestamp: string, emoji: string) {
    return await slackRequest('reactions.add', { channel, timestamp, name: emoji })
  },

  async setStatus(statusText: string, statusEmoji: string) {
    return await slackRequest('users.profile.set', {
      profile: { status_text: statusText, status_emoji: statusEmoji }
    })
  },

  async searchMessages(query: string) {
    return await slackRequest('search.messages', { query })
  }
}

// ============ DISCORD ============

const DISCORD_API = 'https://discord.com/api/v10'

async function discordRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
  const settings = await settingsManager.getSettings()
  const token = settings.discordBotToken

  if (!token) {
    throw new Error('Discord Bot Token not configured')
  }

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json'
    }
  }

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data)
  }

  const response = await fetch(`${DISCORD_API}${endpoint}`, options)
  return response.json()
}

export const discord = {
  async getCurrentUser() {
    return await discordRequest('/users/@me')
  },

  async getGuilds() {
    return await discordRequest('/users/@me/guilds')
  },

  async getGuild(guildId: string) {
    return await discordRequest(`/guilds/${guildId}`)
  },

  async getGuildChannels(guildId: string) {
    return await discordRequest(`/guilds/${guildId}/channels`)
  },

  async sendMessage(channelId: string, content: string, options?: { embeds?: any[]; components?: any[] }) {
    return await discordRequest(`/channels/${channelId}/messages`, 'POST', { content, ...options })
  },

  async getMessages(channelId: string, limit: number = 50) {
    return await discordRequest(`/channels/${channelId}/messages?limit=${limit}`)
  },

  async createReaction(channelId: string, messageId: string, emoji: string) {
    return await discordRequest(`/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`, 'PUT')
  },

  async deleteMessage(channelId: string, messageId: string) {
    return await discordRequest(`/channels/${channelId}/messages/${messageId}`, 'DELETE')
  },

  async createChannel(guildId: string, name: string, type: number = 0) {
    return await discordRequest(`/guilds/${guildId}/channels`, 'POST', { name, type })
  },

  async getGuildMembers(guildId: string, limit: number = 100) {
    return await discordRequest(`/guilds/${guildId}/members?limit=${limit}`)
  }
}

// ============ TRELLO ============

const TRELLO_API = 'https://api.trello.com/1'

async function trelloRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
  const settings = await settingsManager.getSettings()
  const { trelloApiKey, trelloToken } = settings

  if (!trelloApiKey || !trelloToken) {
    throw new Error('Trello API Key and Token not configured')
  }

  let url = `${TRELLO_API}${endpoint}`
  url += endpoint.includes('?') ? '&' : '?'
  url += `key=${trelloApiKey}&token=${trelloToken}`

  const options: RequestInit = { method }

  if (data && method !== 'GET') {
    const params = new URLSearchParams(data)
    url += `&${params}`
  }

  const response = await fetch(url, options)
  return response.json()
}

export const trello = {
  async getBoards() {
    return await trelloRequest('/members/me/boards')
  },

  async getBoard(boardId: string) {
    return await trelloRequest(`/boards/${boardId}`)
  },

  async getLists(boardId: string) {
    return await trelloRequest(`/boards/${boardId}/lists`)
  },

  async getCards(listId: string) {
    return await trelloRequest(`/lists/${listId}/cards`)
  },

  async createCard(listId: string, name: string, desc?: string) {
    return await trelloRequest('/cards', 'POST', { idList: listId, name, desc })
  },

  async updateCard(cardId: string, data: { name?: string; desc?: string; idList?: string }) {
    return await trelloRequest(`/cards/${cardId}`, 'PUT', data)
  },

  async deleteCard(cardId: string) {
    return await trelloRequest(`/cards/${cardId}`, 'DELETE')
  },

  async addComment(cardId: string, text: string) {
    return await trelloRequest(`/cards/${cardId}/actions/comments`, 'POST', { text })
  },

  async createList(boardId: string, name: string) {
    return await trelloRequest('/lists', 'POST', { idBoard: boardId, name })
  }
}

// ============ JIRA ============

async function jiraRequest(domain: string, endpoint: string, method: string = 'GET', data?: any): Promise<any> {
  const settings = await settingsManager.getSettings()
  const { jiraEmail, jiraApiToken } = settings

  if (!jiraEmail || !jiraApiToken) {
    throw new Error('Jira credentials not configured')
  }

  const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64')

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data)
  }

  const response = await fetch(`https://${domain}.atlassian.net/rest/api/3${endpoint}`, options)
  return response.json()
}

export const jira = {
  async getProjects(domain: string) {
    return await jiraRequest(domain, '/project')
  },

  async getIssue(domain: string, issueKey: string) {
    return await jiraRequest(domain, `/issue/${issueKey}`)
  },

  async createIssue(domain: string, data: {
    fields: {
      project: { key: string }
      summary: string
      description?: any
      issuetype: { name: string }
    }
  }) {
    return await jiraRequest(domain, '/issue', 'POST', data)
  },

  async updateIssue(domain: string, issueKey: string, fields: Record<string, any>) {
    return await jiraRequest(domain, `/issue/${issueKey}`, 'PUT', { fields })
  },

  async searchIssues(domain: string, jql: string, maxResults: number = 50) {
    return await jiraRequest(domain, `/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}`)
  },

  async addComment(domain: string, issueKey: string, body: string) {
    return await jiraRequest(domain, `/issue/${issueKey}/comment`, 'POST', {
      body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: body }] }] }
    })
  },

  async transitionIssue(domain: string, issueKey: string, transitionId: string) {
    return await jiraRequest(domain, `/issue/${issueKey}/transitions`, 'POST', {
      transition: { id: transitionId }
    })
  }
}
