import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toolExecutor } from '../tools/tool-executor'
import * as github from '../integrations/github'

// Mock github integration
vi.mock('../integrations/github', () => ({
    getAuthenticatedUser: vi.fn().mockResolvedValue({ login: 'testuser' }),
    listUserRepos: vi.fn().mockResolvedValue([{ name: 'repo1' }, { name: 'repo2' }]),
    getRepo: vi.fn().mockResolvedValue({ name: 'repo1', full_name: 'testuser/repo1' }),
    createRepo: vi.fn().mockResolvedValue({ name: 'newrepo' }),
    deleteRepo: vi.fn().mockResolvedValue({ success: true }),
    forkRepo: vi.fn().mockResolvedValue({ name: 'repo1-fork' }),
    getRepoContents: vi.fn().mockResolvedValue([{ name: 'README.md', type: 'file' }]),
    createOrUpdateFile: vi.fn().mockResolvedValue({ content: { name: 'test.txt' } }),
    listIssues: vi.fn().mockResolvedValue([{ number: 1, title: 'Issue 1' }]),
    getIssue: vi.fn().mockResolvedValue({ number: 1, title: 'Issue 1' }),
    createIssue: vi.fn().mockResolvedValue({ number: 2, title: 'New Issue' }),
    addIssueComment: vi.fn().mockResolvedValue({ id: 123 }),
    listPullRequests: vi.fn().mockResolvedValue([{ number: 10, title: 'PR 10' }]),
    getPullRequest: vi.fn().mockResolvedValue({ number: 10, title: 'PR 10' }),
    createPullRequest: vi.fn().mockResolvedValue({ number: 11 }),
    listWorkflows: vi.fn().mockResolvedValue({ workflows: [] }),
    listWorkflowRuns: vi.fn().mockResolvedValue({ workflow_runs: [] }),
    triggerWorkflow: vi.fn().mockResolvedValue({ success: true }),
    searchRepos: vi.fn().mockResolvedValue({ items: [{ name: 'match1' }] }),
    searchCode: vi.fn().mockResolvedValue({ items: [] }),
    searchIssues: vi.fn().mockResolvedValue({ items: [] }),
    searchUsers: vi.fn().mockResolvedValue({ items: [] }),
    listBranches: vi.fn().mockResolvedValue([{ name: 'main' }]),
    createBranch: vi.fn().mockResolvedValue({ ref: 'refs/heads/feat' }),
    starRepo: vi.fn().mockResolvedValue({ success: true }),
    unstarRepo: vi.fn().mockResolvedValue({ success: true }),
    getCloneUrl: vi.fn().mockReturnValue('https://github.com/owner/repo.git')
}))

// Mock bash to avoid real git commands
vi.mock('../tools/bash', () => ({
    executeCommand: vi.fn().mockResolvedValue({ success: true, output: 'Git output' })
}))

describe('GitHub Tools Integration Extended', () => {

    it('should expose github_get_user', async () => {
        const result = await toolExecutor.executeTool('github_get_user', {})
        expect(result).toEqual({ login: 'testuser' })
        expect(github.getAuthenticatedUser).toHaveBeenCalled()
    })

    it('should expose github_delete_repo', async () => {
        const result = await toolExecutor.executeTool('github_delete_repo', { owner: 'owner', repo: 'repo' })
        expect(result).toEqual({ success: true })
        expect(github.deleteRepo).toHaveBeenCalledWith('owner', 'repo')
    })

    it('should expose github_create_file with sha', async () => {
        const result = await toolExecutor.executeTool('github_create_file', {
            owner: 'owner',
            repo: 'repo',
            path: 'test.txt',
            content: 'hello',
            message: 'feat: add test file',
            sha: 'oldsha'
        })
        expect(result).toEqual({ content: { name: 'test.txt' } })
        expect(github.createOrUpdateFile).toHaveBeenCalledWith('owner', 'repo', 'test.txt', 'hello', 'feat: add test file', 'oldsha')
    })

    it('should expose github_add_comment', async () => {
        const result = await toolExecutor.executeTool('github_add_comment', {
            owner: 'owner',
            repo: 'repo',
            issue_number: 1,
            body: 'Nice work'
        })
        expect(result).toEqual({ id: 123 })
        expect(github.addIssueComment).toHaveBeenCalledWith('owner', 'repo', 1, 'Nice work')
    })

    it('should expose github_create_pr', async () => {
        const result = await toolExecutor.executeTool('github_create_pr', {
            owner: 'owner',
            repo: 'repo',
            title: 'Fix bug',
            head: 'feat',
            base: 'main'
        })
        expect(result).toEqual({ number: 11 })
        expect(github.createPullRequest).toHaveBeenCalledWith('owner', 'repo', 'Fix bug', 'feat', 'main', undefined)
    })

    it('should expose git_push', async () => {
        const result = await toolExecutor.executeTool('git_push', { remote: 'origin', branch: 'main' })
        expect(result).toEqual({ success: true, output: 'Git output' })
    })

    it('should expose git_pull', async () => {
        const result = await toolExecutor.executeTool('git_pull', { remote: 'origin', branch: 'main' })
        expect(result).toEqual({ success: true, output: 'Git output' })
    })

    it('should expose git_commit', async () => {
        const result = await toolExecutor.executeTool('git_commit', { message: 'test commit' })
        expect(result).toEqual({ success: true, output: 'Git output' })
    })
})
