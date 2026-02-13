/**
 * Social Media Integrations
 * Twitter/X, LinkedIn, Facebook, Instagram, YouTube, Reddit
 */

import { settingsManager } from '../settings'
import { appEvents } from '../events'

export class OAuthProxy {
  private static instance: OAuthProxy
  private isRefreshing: Map<string, boolean> = new Map()

  constructor() {
    this.setupListeners()
  }

  static getInstance(): OAuthProxy {
    if (!OAuthProxy.instance) {
      OAuthProxy.instance = new OAuthProxy()
    }
    return OAuthProxy.instance
  }

  private setupListeners() {
    appEvents.on('auth:callback', async (data: any) => {
      console.log(`[OAuthProxy] Received callback for ${data.provider}`)
      // In a real app, this would exchange 'code' for 'tokens'
      // For Rami Bot, we emit an event for the UI/User to know or handle it if we have client secrets
    })
  }

  async refreshToken(provider: string): Promise<string | null> {
    if (this.isRefreshing.get(provider)) return null
    this.isRefreshing.set(provider, true)

    try {
      const settings = await settingsManager.getSettings()
      let endpoint = ''
      let body: any = {}
      let tokenField: any = ''
      let refreshField: any = ''

      switch (provider) {
        case 'google':
          endpoint = 'https://oauth2.googleapis.com/token'
          body = {
            refresh_token: settings.googleRefreshToken,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            grant_type: 'refresh_token'
          }
          tokenField = 'googleAccessToken'
          break
        case 'twitter':
          endpoint = 'https://api.twitter.com/2/oauth2/token'
          body = {
            refresh_token: settings.twitterRefreshToken,
            client_id: process.env.TWITTER_CLIENT_ID,
            client_secret: process.env.TWITTER_CLIENT_SECRET,
            grant_type: 'refresh_token'
          }
          tokenField = 'twitterBearerToken'
          break
        // Add other providers as needed
      }

      if (!endpoint || !body.refresh_token) {
        this.isRefreshing.set(provider, false)
        return null
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body).toString()
      })

      const data = await response.json()
      if (data.access_token) {
        const updates: any = { [tokenField]: data.access_token }
        if (data.refresh_token) {
          updates[`${provider}RefreshToken`] = data.refresh_token
        }
        await settingsManager.updateSettings(updates)
        console.log(`[OAuthProxy] Successfully refreshed ${provider} token`)
        return data.access_token
      }
    } catch (error: any) {
      console.error(`[OAuthProxy] Failed to refresh ${provider} token:`, error.message)
    } finally {
      this.isRefreshing.set(provider, false)
    }

    return null
  }
}

export const oauthProxy = OAuthProxy.getInstance()

// ============ TWITTER / X ============

const TWITTER_API = 'https://api.twitter.com/2'

async function twitterRequest(endpoint: string, method: string = 'GET', data?: any, isRetry: boolean = false): Promise<any> {
  const settings = await settingsManager.getSettings()
  const bearerToken = settings.twitterBearerToken

  if (!bearerToken) {
    throw new Error('Twitter Bearer Token not configured')
  }

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Content-Type': 'application/json'
    }
  }

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data)
  }

  const response = await fetch(`${TWITTER_API}${endpoint}`, options)

  // AUTO-REFRESH LOGIC
  if (response.status === 401 && !isRetry) {
    console.log('[Twitter] Token expired, attempting refresh...')
    const newToken = await oauthProxy.refreshToken('twitter')
    if (newToken) {
      return twitterRequest(endpoint, method, data, true)
    }
  }

  return response.json()
}

export const twitter = {
  // Get user by username
  async getUser(username: string) {
    return await twitterRequest(`/users/by/username/${username}?user.fields=description,public_metrics,profile_image_url,created_at`)
  },

  // Get user tweets
  async getUserTweets(userId: string, maxResults: number = 10) {
    return await twitterRequest(`/users/${userId}/tweets?max_results=${maxResults}&tweet.fields=created_at,public_metrics`)
  },

  // Search tweets
  async searchTweets(query: string, maxResults: number = 10) {
    return await twitterRequest(`/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${maxResults}&tweet.fields=created_at,public_metrics,author_id`)
  },

  // Get trending topics (requires elevated access)
  async getTrending(woeid: number = 1) {
    // Note: Trends endpoint requires v1.1 API
    return { message: 'Trending requires Twitter API v1.1 with OAuth 1.0a' }
  },

  // Post tweet (requires OAuth 2.0 with user context)
  async postTweet(text: string) {
    return await twitterRequest('/tweets', 'POST', { text })
  },

  // Get tweet by ID
  async getTweet(tweetId: string) {
    return await twitterRequest(`/tweets/${tweetId}?tweet.fields=created_at,public_metrics,author_id`)
  },

  // Get user followers
  async getFollowers(userId: string, maxResults: number = 100) {
    return await twitterRequest(`/users/${userId}/followers?max_results=${maxResults}&user.fields=description,public_metrics`)
  },

  // Get user following
  async getFollowing(userId: string, maxResults: number = 100) {
    return await twitterRequest(`/users/${userId}/following?max_results=${maxResults}&user.fields=description,public_metrics`)
  }
}

// ============ LINKEDIN ============

const LINKEDIN_API = 'https://api.linkedin.com/v2'

async function linkedinRequest(endpoint: string, method: string = 'GET', data?: any, isRetry: boolean = false): Promise<any> {
  const settings = await settingsManager.getSettings()
  const accessToken = settings.linkedinAccessToken

  if (!accessToken) {
    throw new Error('LinkedIn Access Token not configured')
  }

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    }
  }

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data)
  }

  const response = await fetch(`${LINKEDIN_API}${endpoint}`, options)

  if (response.status === 401 && !isRetry) {
    console.log('[LinkedIn] Token expired, attempting refresh...')
    const newToken = await oauthProxy.refreshToken('linkedin')
    if (newToken) {
      return linkedinRequest(endpoint, method, data, true)
    }
  }

  return response.json()
}

export const linkedin = {
  // Get current user profile
  async getProfile() {
    return await linkedinRequest('/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))')
  },

  // Get user email
  async getEmail() {
    return await linkedinRequest('/emailAddress?q=members&projection=(elements*(handle~))')
  },

  // Share post
  async sharePost(text: string, visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC') {
    const profile = await this.getProfile()
    return await linkedinRequest('/ugcPosts', 'POST', {
      author: `urn:li:person:${profile.id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': visibility
      }
    })
  },

  // Get connections count
  async getConnectionsCount() {
    return await linkedinRequest('/connections?q=viewer&start=0&count=0')
  }
}

// ============ FACEBOOK / META ============

const FACEBOOK_API = 'https://graph.facebook.com/v18.0'

async function facebookRequest(endpoint: string, method: string = 'GET', data?: any, isRetry: boolean = false): Promise<any> {
  const settings = await settingsManager.getSettings()
  const accessToken = settings.facebookAccessToken

  if (!accessToken) {
    throw new Error('Facebook Access Token not configured')
  }

  let url = `${FACEBOOK_API}${endpoint}`
  url += endpoint.includes('?') ? '&' : '?'
  url += `access_token=${accessToken}`

  const options: RequestInit = { method }

  if (data && method !== 'GET') {
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(data)
  }

  const response = await fetch(url, options)
  const result = await response.json()

  if (result.error && result.error.code === 190 && !isRetry) {
    console.log('[Facebook] Token expired, attempting refresh...')
    const newToken = await oauthProxy.refreshToken('facebook')
    if (newToken) {
      return facebookRequest(endpoint, method, data, true)
    }
  }

  return result
}

export const facebook = {
  // Get current user
  async getMe() {
    return await facebookRequest('/me?fields=id,name,email,picture')
  },

  // Get user's pages
  async getPages() {
    return await facebookRequest('/me/accounts')
  },

  // Post to page
  async postToPage(pageId: string, message: string, pageAccessToken: string) {
    const settings = await settingsManager.getSettings()
    return await fetch(`${FACEBOOK_API}/${pageId}/feed?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    }).then(r => r.json())
  },

  // Get page posts
  async getPagePosts(pageId: string) {
    return await facebookRequest(`/${pageId}/posts?fields=id,message,created_time,shares,likes.summary(true),comments.summary(true)`)
  },

  // Get page insights
  async getPageInsights(pageId: string, metric: string = 'page_impressions') {
    return await facebookRequest(`/${pageId}/insights/${metric}`)
  }
}

// ============ INSTAGRAM ============

export const instagram = {
  // Instagram uses Facebook Graph API
  // Get Instagram Business Account
  async getBusinessAccount(facebookPageId: string) {
    return await facebookRequest(`/${facebookPageId}?fields=instagram_business_account`)
  },

  // Get Instagram profile
  async getProfile(instagramAccountId: string) {
    return await facebookRequest(`/${instagramAccountId}?fields=id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography`)
  },

  // Get media
  async getMedia(instagramAccountId: string) {
    return await facebookRequest(`/${instagramAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count`)
  },

  // Get insights
  async getInsights(instagramAccountId: string, metric: string = 'impressions,reach') {
    return await facebookRequest(`/${instagramAccountId}/insights?metric=${metric}&period=day`)
  },

  // Publish media (requires Media Container)
  async createMediaContainer(instagramAccountId: string, imageUrl: string, caption: string) {
    return await facebookRequest(`/${instagramAccountId}/media`, 'POST', {
      image_url: imageUrl,
      caption
    })
  },

  async publishMedia(instagramAccountId: string, containerId: string) {
    return await facebookRequest(`/${instagramAccountId}/media_publish`, 'POST', {
      creation_id: containerId
    })
  }
}

// ============ YOUTUBE ============

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3'

async function youtubeRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const settings = await settingsManager.getSettings()
  const apiKey = settings.googleApiKey

  if (!apiKey) {
    throw new Error('Google API Key not configured')
  }

  const searchParams = new URLSearchParams({ ...params, key: apiKey })
  const response = await fetch(`${YOUTUBE_API}${endpoint}?${searchParams}`)
  return response.json()
}

export const youtube = {
  // Search videos
  async searchVideos(query: string, maxResults: number = 10) {
    return await youtubeRequest('/search', {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: maxResults.toString()
    })
  },

  // Get video details
  async getVideo(videoId: string) {
    return await youtubeRequest('/videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoId
    })
  },

  // Get channel details
  async getChannel(channelId: string) {
    return await youtubeRequest('/channels', {
      part: 'snippet,statistics,brandingSettings',
      id: channelId
    })
  },

  // Get channel by username
  async getChannelByUsername(username: string) {
    return await youtubeRequest('/channels', {
      part: 'snippet,statistics',
      forUsername: username
    })
  },

  // Get playlist items
  async getPlaylistItems(playlistId: string, maxResults: number = 50) {
    return await youtubeRequest('/playlistItems', {
      part: 'snippet',
      playlistId,
      maxResults: maxResults.toString()
    })
  },

  // Get video comments
  async getVideoComments(videoId: string, maxResults: number = 20) {
    return await youtubeRequest('/commentThreads', {
      part: 'snippet',
      videoId,
      maxResults: maxResults.toString()
    })
  },

  // Get trending videos
  async getTrending(regionCode: string = 'US', maxResults: number = 10) {
    return await youtubeRequest('/videos', {
      part: 'snippet,statistics',
      chart: 'mostPopular',
      regionCode,
      maxResults: maxResults.toString()
    })
  }
}

// ============ REDDIT ============

const REDDIT_API = 'https://oauth.reddit.com'
const REDDIT_AUTH = 'https://www.reddit.com/api/v1'

export const reddit = {
  // Get access token
  async getAccessToken(clientId: string, clientSecret: string) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const response = await fetch(`${REDDIT_AUTH}/access_token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    })

    return response.json()
  },

  // Get subreddit posts
  async getSubredditPosts(subreddit: string, sort: 'hot' | 'new' | 'top' = 'hot', limit: number = 25) {
    const settings = await settingsManager.getSettings()
    const accessToken = settings.redditAccessToken

    const headers: Record<string, string> = {
      'User-Agent': 'Rami-Bot/1.0'
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const url = accessToken
      ? `${REDDIT_API}/r/${subreddit}/${sort}?limit=${limit}`
      : `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}`

    const response = await fetch(url, { headers })
    return response.json()
  },

  // Search Reddit
  async search(query: string, subreddit?: string, limit: number = 25) {
    const settings = await settingsManager.getSettings()
    const accessToken = settings.redditAccessToken

    const headers: Record<string, string> = {
      'User-Agent': 'Rami-Bot/1.0'
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    let url = accessToken ? REDDIT_API : 'https://www.reddit.com'
    url += subreddit ? `/r/${subreddit}/search.json` : '/search.json'
    url += `?q=${encodeURIComponent(query)}&limit=${limit}`
    if (subreddit) url += '&restrict_sr=on'

    const response = await fetch(url, { headers })
    return response.json()
  },

  // Get user profile
  async getUser(username: string) {
    const response = await fetch(`https://www.reddit.com/user/${username}/about.json`, {
      headers: { 'User-Agent': 'Rami-Bot/1.0' }
    })
    return response.json()
  },

  // Get post comments
  async getComments(subreddit: string, postId: string) {
    const response = await fetch(`https://www.reddit.com/r/${subreddit}/comments/${postId}.json`, {
      headers: { 'User-Agent': 'Rami-Bot/1.0' }
    })
    return response.json()
  }
}

// ============ TIKTOK ============

export const tiktok = {
  // TikTok API requires business account and app approval
  // These are placeholder functions

  async getUserInfo(accessToken: string) {
    const response = await fetch('https://open.tiktokapis.com/v2/user/info/', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    return response.json()
  },

  async getUserVideos(accessToken: string) {
    const response = await fetch('https://open.tiktokapis.com/v2/video/list/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ max_count: 20 })
    })
    return response.json()
  }
}

// ============ PINTEREST ============

const PINTEREST_API = 'https://api.pinterest.com/v5'

export const pinterest = {
  async getUser(accessToken: string) {
    const response = await fetch(`${PINTEREST_API}/user_account`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    return response.json()
  },

  async getBoards(accessToken: string) {
    const response = await fetch(`${PINTEREST_API}/boards`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    return response.json()
  },

  async getPins(accessToken: string, boardId: string) {
    const response = await fetch(`${PINTEREST_API}/boards/${boardId}/pins`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    return response.json()
  },

  async createPin(accessToken: string, boardId: string, data: {
    title: string
    description: string
    link?: string
    media_source: { source_type: string; url: string }
  }) {
    const response = await fetch(`${PINTEREST_API}/pins`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ board_id: boardId, ...data })
    })
    return response.json()
  }
}
