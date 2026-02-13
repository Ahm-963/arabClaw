/**
 * Email Integration
 * Gmail API and SMTP support
 */

import { settingsManager } from '../settings'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// ============ GMAIL API ============

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1'

async function gmailRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
  const settings = await settingsManager.getSettings()
  const accessToken = settings.gmailAccessToken

  if (!accessToken) {
    throw new Error('Gmail Access Token not configured. Please authenticate with Google.')
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

  const response = await fetch(`${GMAIL_API}${endpoint}`, options)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Gmail API error: ${response.status}`)
  }

  return response.json()
}

export const gmail = {
  // Get user profile
  async getProfile() {
    return await gmailRequest('/users/me/profile')
  },

  // List messages
  async listMessages(options?: {
    maxResults?: number
    q?: string // Gmail search query
    labelIds?: string[]
    pageToken?: string
  }) {
    const params = new URLSearchParams()
    if (options?.maxResults) params.set('maxResults', options.maxResults.toString())
    if (options?.q) params.set('q', options.q)
    if (options?.labelIds) params.set('labelIds', options.labelIds.join(','))
    if (options?.pageToken) params.set('pageToken', options.pageToken)
    
    return await gmailRequest(`/users/me/messages?${params}`)
  },

  // Get a specific message
  async getMessage(messageId: string, format: 'full' | 'minimal' | 'raw' = 'full') {
    const message = await gmailRequest(`/users/me/messages/${messageId}?format=${format}`)
    
    // Parse headers for convenience
    if (message.payload?.headers) {
      const headers: Record<string, string> = {}
      for (const header of message.payload.headers) {
        headers[header.name.toLowerCase()] = header.value
      }
      message.parsedHeaders = headers
    }
    
    // Decode body if present
    if (message.payload?.body?.data) {
      message.decodedBody = Buffer.from(message.payload.body.data, 'base64').toString('utf-8')
    }
    
    // Handle multipart messages
    if (message.payload?.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          message.textBody = Buffer.from(part.body.data, 'base64').toString('utf-8')
        }
        if (part.mimeType === 'text/html' && part.body?.data) {
          message.htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8')
        }
      }
    }
    
    return message
  },

  // Send email
  async sendEmail(to: string, subject: string, body: string, options?: {
    cc?: string
    bcc?: string
    html?: boolean
    attachments?: Array<{ filename: string; content: string; encoding?: string }>
  }) {
    const boundary = 'boundary_' + Date.now()
    
    let email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`
    ]

    if (options?.cc) email.push(`Cc: ${options.cc}`)
    if (options?.bcc) email.push(`Bcc: ${options.bcc}`)

    if (options?.attachments?.length) {
      email.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
      email.push('')
      email.push(`--${boundary}`)
      email.push(`Content-Type: ${options.html ? 'text/html' : 'text/plain'}; charset="UTF-8"`)
      email.push('')
      email.push(body)
      
      for (const attachment of options.attachments) {
        email.push(`--${boundary}`)
        email.push(`Content-Type: application/octet-stream; name="${attachment.filename}"`)
        email.push(`Content-Disposition: attachment; filename="${attachment.filename}"`)
        email.push(`Content-Transfer-Encoding: base64`)
        email.push('')
        email.push(attachment.content)
      }
      email.push(`--${boundary}--`)
    } else {
      email.push(`Content-Type: ${options?.html ? 'text/html' : 'text/plain'}; charset="UTF-8"`)
      email.push('')
      email.push(body)
    }

    const raw = Buffer.from(email.join('\r\n')).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    return await gmailRequest('/users/me/messages/send', 'POST', { raw })
  },

  // Reply to email
  async replyToEmail(messageId: string, body: string, options?: { html?: boolean }) {
    const original = await this.getMessage(messageId)
    const headers = original.parsedHeaders || {}
    
    const to = headers['reply-to'] || headers['from']
    const subject = headers['subject']?.startsWith('Re:') 
      ? headers['subject'] 
      : `Re: ${headers['subject']}`
    
    const threadId = original.threadId

    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `In-Reply-To: ${headers['message-id']}`,
      `References: ${headers['message-id']}`,
      `MIME-Version: 1.0`,
      `Content-Type: ${options?.html ? 'text/html' : 'text/plain'}; charset="UTF-8"`,
      '',
      body
    ]

    const raw = Buffer.from(email.join('\r\n')).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    return await gmailRequest('/users/me/messages/send', 'POST', { raw, threadId })
  },

  // Create draft
  async createDraft(to: string, subject: string, body: string) {
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset="UTF-8"`,
      '',
      body
    ]

    const raw = Buffer.from(email.join('\r\n')).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

    return await gmailRequest('/users/me/drafts', 'POST', { message: { raw } })
  },

  // List drafts
  async listDrafts() {
    return await gmailRequest('/users/me/drafts')
  },

  // Delete message (move to trash)
  async trashMessage(messageId: string) {
    return await gmailRequest(`/users/me/messages/${messageId}/trash`, 'POST')
  },

  // Permanently delete message
  async deleteMessage(messageId: string) {
    return await gmailRequest(`/users/me/messages/${messageId}`, 'DELETE')
  },

  // Mark as read
  async markAsRead(messageId: string) {
    return await gmailRequest(`/users/me/messages/${messageId}/modify`, 'POST', {
      removeLabelIds: ['UNREAD']
    })
  },

  // Mark as unread
  async markAsUnread(messageId: string) {
    return await gmailRequest(`/users/me/messages/${messageId}/modify`, 'POST', {
      addLabelIds: ['UNREAD']
    })
  },

  // Star message
  async starMessage(messageId: string) {
    return await gmailRequest(`/users/me/messages/${messageId}/modify`, 'POST', {
      addLabelIds: ['STARRED']
    })
  },

  // Archive message
  async archiveMessage(messageId: string) {
    return await gmailRequest(`/users/me/messages/${messageId}/modify`, 'POST', {
      removeLabelIds: ['INBOX']
    })
  },

  // List labels
  async listLabels() {
    return await gmailRequest('/users/me/labels')
  },

  // Create label
  async createLabel(name: string) {
    return await gmailRequest('/users/me/labels', 'POST', { name })
  },

  // Search emails
  async search(query: string, maxResults: number = 10) {
    return await this.listMessages({ q: query, maxResults })
  },

  // Get unread count
  async getUnreadCount() {
    const result = await this.listMessages({ q: 'is:unread', maxResults: 1 })
    return result.resultSizeEstimate || 0
  },

  // Get threads
  async listThreads(options?: { maxResults?: number; q?: string }) {
    const params = new URLSearchParams()
    if (options?.maxResults) params.set('maxResults', options.maxResults.toString())
    if (options?.q) params.set('q', options.q)
    
    return await gmailRequest(`/users/me/threads?${params}`)
  },

  // Get thread
  async getThread(threadId: string) {
    return await gmailRequest(`/users/me/threads/${threadId}`)
  }
}

// ============ SMTP EMAIL (PowerShell-based) ============

export async function sendSMTPEmail(options: {
  to: string
  subject: string
  body: string
  from?: string
  smtpServer?: string
  port?: number
  username?: string
  password?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await settingsManager.getSettings()
    
    const server = options.smtpServer || settings.smtpHost || 'smtp.gmail.com'
    const port = options.port || settings.smtpPort || 587
    const username = options.username || settings.smtpUser
    const password = options.password || settings.smtpPassword
    const from = options.from || username
    
    if (!username || !password) {
      return { success: false, error: 'SMTP credentials not configured' }
    }

    const script = `
      $secpasswd = ConvertTo-SecureString '${password.replace(/'/g, "''")}' -AsPlainText -Force
      $cred = New-Object System.Management.Automation.PSCredential ('${username}', $secpasswd)
      
      Send-MailMessage -From '${from}' -To '${options.to}' -Subject '${options.subject.replace(/'/g, "''")}' -Body '${options.body.replace(/'/g, "''")}' -SmtpServer '${server}' -Port ${port} -Credential $cred -UseSsl
      
      Write-Output 'SUCCESS'
    `
    
    const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
    
    return { success: stdout.includes('SUCCESS') }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============ COMMON EMAIL PROVIDERS ============

export const emailProviders = {
  gmail: { host: 'smtp.gmail.com', port: 587 },
  outlook: { host: 'smtp.office365.com', port: 587 },
  yahoo: { host: 'smtp.mail.yahoo.com', port: 587 },
  icloud: { host: 'smtp.mail.me.com', port: 587 }
}
