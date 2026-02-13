/**
 * GitHub Integration
 * Full GitHub API access for repositories, issues, PRs, etc.
 */

import { settingsManager } from '../settings'

const GITHUB_API = 'https://api.github.com'

async function getHeaders(): Promise<Record<string, string>> {
  const settings = await settingsManager.getSettings()
  const token = settings.githubToken

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Rami-Bot'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

async function githubRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const headers = await getHeaders()

  const response = await fetch(`${GITHUB_API}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `GitHub API error: ${response.status}`)
  }

  return response.json()
}

// User & Auth
export async function getAuthenticatedUser() {
  return await githubRequest('/user')
}

export async function getUserProfile(username: string) {
  return await githubRequest(`/users/${username}`)
}

// Repositories
export async function listUserRepos(username?: string, options?: { sort?: string; per_page?: number }) {
  const endpoint = username ? `/users/${username}/repos` : '/user/repos'
  const params = new URLSearchParams()
  if (options?.sort) params.set('sort', options.sort)
  if (options?.per_page) params.set('per_page', options.per_page.toString())
  return await githubRequest(`${endpoint}?${params}`)
}

export async function getRepo(owner: string, repo: string) {
  return await githubRequest(`/repos/${owner}/${repo}`)
}

export async function createRepo(name: string, options?: {
  description?: string
  private?: boolean
  auto_init?: boolean
}) {
  return await githubRequest('/user/repos', {
    method: 'POST',
    body: JSON.stringify({ name, ...options })
  })
}

export async function deleteRepo(owner: string, repo: string) {
  return await githubRequest(`/repos/${owner}/${repo}`, { method: 'DELETE' })
}

export async function forkRepo(owner: string, repo: string) {
  return await githubRequest(`/repos/${owner}/${repo}/forks`, { method: 'POST' })
}

// Repository Contents
export async function getRepoContents(owner: string, repo: string, path: string = '') {
  return await githubRequest(`/repos/${owner}/${repo}/contents/${path}`)
}

export async function getFileContent(owner: string, repo: string, path: string) {
  const content = await githubRequest(`/repos/${owner}/${repo}/contents/${path}`)
  if (content.content) {
    return {
      ...content,
      decodedContent: Buffer.from(content.content, 'base64').toString('utf-8')
    }
  }
  return content
}

export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string
) {
  const body: any = {
    message,
    content: Buffer.from(content).toString('base64')
  }
  if (sha) body.sha = sha

  return await githubRequest(`/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify(body)
  })
}

export async function deleteFile(owner: string, repo: string, path: string, sha: string, message: string) {
  return await githubRequest(`/repos/${owner}/${repo}/contents/${path}`, {
    method: 'DELETE',
    body: JSON.stringify({ message, sha })
  })
}

// Branches
export async function listBranches(owner: string, repo: string) {
  return await githubRequest(`/repos/${owner}/${repo}/branches`)
}

export async function getBranch(owner: string, repo: string, branch: string) {
  return await githubRequest(`/repos/${owner}/${repo}/branches/${branch}`)
}

export async function createBranch(owner: string, repo: string, branch: string, fromSha: string) {
  return await githubRequest(`/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({
      ref: `refs/heads/${branch}`,
      sha: fromSha
    })
  })
}

// Issues
export async function listIssues(owner: string, repo: string, options?: {
  state?: 'open' | 'closed' | 'all'
  labels?: string
  per_page?: number
}) {
  const params = new URLSearchParams()
  if (options?.state) params.set('state', options.state)
  if (options?.labels) params.set('labels', options.labels)
  if (options?.per_page) params.set('per_page', options.per_page.toString())
  return await githubRequest(`/repos/${owner}/${repo}/issues?${params}`)
}

export async function getIssue(owner: string, repo: string, issueNumber: number) {
  return await githubRequest(`/repos/${owner}/${repo}/issues/${issueNumber}`)
}

export async function createIssue(owner: string, repo: string, title: string, body?: string, labels?: string[]) {
  return await githubRequest(`/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    body: JSON.stringify({ title, body, labels })
  })
}

export async function updateIssue(owner: string, repo: string, issueNumber: number, updates: {
  title?: string
  body?: string
  state?: 'open' | 'closed'
  labels?: string[]
}) {
  return await githubRequest(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  })
}

export async function addIssueComment(owner: string, repo: string, issueNumber: number, body: string) {
  return await githubRequest(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body })
  })
}

// Pull Requests
export async function listPullRequests(owner: string, repo: string, options?: {
  state?: 'open' | 'closed' | 'all'
  per_page?: number
}) {
  const params = new URLSearchParams()
  if (options?.state) params.set('state', options.state)
  if (options?.per_page) params.set('per_page', options.per_page.toString())
  return await githubRequest(`/repos/${owner}/${repo}/pulls?${params}`)
}

export async function getPullRequest(owner: string, repo: string, prNumber: number) {
  return await githubRequest(`/repos/${owner}/${repo}/pulls/${prNumber}`)
}

export async function createPullRequest(owner: string, repo: string, title: string, head: string, base: string, body?: string) {
  return await githubRequest(`/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({ title, head, base, body })
  })
}

export async function mergePullRequest(owner: string, repo: string, prNumber: number, commitMessage?: string) {
  return await githubRequest(`/repos/${owner}/${repo}/pulls/${prNumber}/merge`, {
    method: 'PUT',
    body: JSON.stringify({ commit_message: commitMessage })
  })
}

// Commits
export async function listCommits(owner: string, repo: string, options?: {
  sha?: string
  per_page?: number
}) {
  const params = new URLSearchParams()
  if (options?.sha) params.set('sha', options.sha)
  if (options?.per_page) params.set('per_page', options.per_page.toString())
  return await githubRequest(`/repos/${owner}/${repo}/commits?${params}`)
}

export async function getCommit(owner: string, repo: string, sha: string) {
  return await githubRequest(`/repos/${owner}/${repo}/commits/${sha}`)
}

// Releases
export async function listReleases(owner: string, repo: string) {
  return await githubRequest(`/repos/${owner}/${repo}/releases`)
}

export async function getLatestRelease(owner: string, repo: string) {
  return await githubRequest(`/repos/${owner}/${repo}/releases/latest`)
}

export async function createRelease(owner: string, repo: string, tagName: string, options?: {
  name?: string
  body?: string
  draft?: boolean
  prerelease?: boolean
}) {
  return await githubRequest(`/repos/${owner}/${repo}/releases`, {
    method: 'POST',
    body: JSON.stringify({ tag_name: tagName, ...options })
  })
}

// Gists
export async function listGists(username?: string) {
  const endpoint = username ? `/users/${username}/gists` : '/gists'
  return await githubRequest(endpoint)
}

export async function createGist(files: Record<string, { content: string }>, description?: string, isPublic?: boolean) {
  return await githubRequest('/gists', {
    method: 'POST',
    body: JSON.stringify({ files, description, public: isPublic })
  })
}

export async function getGist(gistId: string) {
  return await githubRequest(`/gists/${gistId}`)
}

// Search
export async function searchRepos(query: string, options?: { sort?: string; per_page?: number }) {
  const params = new URLSearchParams({ q: query })
  if (options?.sort) params.set('sort', options.sort)
  if (options?.per_page) params.set('per_page', options.per_page.toString())
  return await githubRequest(`/search/repositories?${params}`)
}

export async function searchCode(query: string) {
  return await githubRequest(`/search/code?q=${encodeURIComponent(query)}`)
}

export async function searchIssues(query: string) {
  return await githubRequest(`/search/issues?q=${encodeURIComponent(query)}`)
}

export async function searchUsers(query: string) {
  return await githubRequest(`/search/users?q=${encodeURIComponent(query)}`)
}

// Stars & Watching
export async function starRepo(owner: string, repo: string) {
  return await githubRequest(`/user/starred/${owner}/${repo}`, { method: 'PUT' })
}

export async function unstarRepo(owner: string, repo: string) {
  return await githubRequest(`/user/starred/${owner}/${repo}`, { method: 'DELETE' })
}

export async function listStarred() {
  return await githubRequest('/user/starred')
}

// Actions/Workflows
export async function listWorkflows(owner: string, repo: string) {
  return await githubRequest(`/repos/${owner}/${repo}/actions/workflows`)
}

export async function listWorkflowRuns(owner: string, repo: string, workflowId?: string | number) {
  const endpoint = workflowId
    ? `/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs`
    : `/repos/${owner}/${repo}/actions/runs`
  return await githubRequest(endpoint)
}

export async function triggerWorkflow(owner: string, repo: string, workflowId: string | number, ref: string, inputs?: Record<string, string>) {
  return await githubRequest(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref, inputs })
  })
}

// Clone URL helper
export function getCloneUrl(owner: string, repo: string, useSSH: boolean = false): string {
  return useSSH
    ? `git@github.com:${owner}/${repo}.git`
    : `https://github.com/${owner}/${repo}.git`
}

export async function test() {
  try {
    const user = await getAuthenticatedUser()
    return { success: true, message: `Connected as ${user.login}` }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
