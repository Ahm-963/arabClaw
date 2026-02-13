import { appEvents } from '../events'
import { auditLogger } from './audit-logger'

export type ActionType = 'read' | 'write' | 'execute' | 'delete' | 'network'
export type ResourceType = 'file' | 'memory' | 'settings' | 'system' | 'web'

export interface Permission {
    id: string
    agentRole: string | '*'
    action: ActionType | '*'
    resource: ResourceType | '*'
    resourcePattern?: string // Regex for specific files/urls
    condition?: (context: any) => boolean
    ttl?: number // Timestamp when this permission expires
}

export interface PolicyCheckResult {
    allowed: boolean
    reason: string
    requiresDiff?: boolean
    isTemporary?: boolean
}

export class PolicyEngine {
    private permissions: Map<string, Permission> = new Map()
    private temporaryPermissions: Map<string, Permission> = new Map()

    constructor() {
        this.loadDefaultPolicies()
    }

    // Load immutable "Constitution"
    private loadDefaultPolicies() {
        // 1. Coder can Write Files
        this.addPermission({
            id: 'coder-write-files',
            agentRole: 'coder',
            action: 'write',
            resource: 'file'
        })

        // 2. Researcher can Search Web
        this.addPermission({
            id: 'researcher-web',
            agentRole: 'researcher',
            action: 'network',
            resource: 'web'
        })

        // 3. Reviewer can Read Files but NOT Write
        this.addPermission({
            id: 'reviewer-read',
            agentRole: 'reviewer',
            action: 'read',
            resource: 'file'
        })

        // 4. Default Assistant can DO ANYTHING (God Mode)
        // In a real system, we'd limit this, but for this user request ("God Mode"), we enable it.
        this.addPermission({
            id: 'assistant-god-mode',
            agentRole: 'assistant',
            action: '*', // Allow all actions
            resource: '*' // On all resources
        })

        // Also allow 'executor' role if used
        this.addPermission({
            id: 'executor-god-mode',
            agentRole: 'executor',
            action: '*',
            resource: '*'
        })
    }

    addPermission(perm: Permission) {
        this.permissions.set(perm.id, perm)
    }

    getAllPermissions(): Permission[] {
        return Array.from(this.permissions.values())
    }

    grantTemporaryPermission(perm: Permission, durationMs: number) {
        perm.ttl = Date.now() + durationMs
        this.temporaryPermissions.set(perm.id, perm)

        appEvents.emit('org:policy_update', {
            type: 'grant_temp',
            permission: perm,
            duration: durationMs
        })

        // Auto-expire
        setTimeout(() => {
            if (this.temporaryPermissions.has(perm.id)) {
                this.temporaryPermissions.delete(perm.id)
                appEvents.emit('org:policy_update', {
                    type: 'expire_temp',
                    permissionId: perm.id
                })
            }
        }, durationMs)
    }

    checkPermission(agentRole: string, action: ActionType, resource: ResourceType, resourceId?: string): PolicyCheckResult {
        const now = Date.now()

        // 1. Check Temporary Permissions first
        for (const perm of this.temporaryPermissions.values()) {
            if (perm.ttl && perm.ttl < now) {
                this.temporaryPermissions.delete(perm.id)
                continue
            }
            if (this.matches(perm, agentRole, action, resource, resourceId)) {
                const result = { allowed: true, reason: `Temporary permission: ${perm.id}`, isTemporary: true }

                // Audit log
                this.logDecision(agentRole, action, resource, resourceId, result, perm.id)

                return result
            }
        }

        // 2. Check Permanent Policies
        for (const perm of this.permissions.values()) {
            if (this.matches(perm, agentRole, action, resource, resourceId)) {
                const result = { allowed: true, reason: `Policy: ${perm.id}` }

                // Audit log
                this.logDecision(agentRole, action, resource, resourceId, result, perm.id)

                return result
            }
        }

        // Default Deny
        const result = { allowed: false, reason: 'No matching policy found' }

        // Audit log
        this.logDecision(agentRole, action, resource, resourceId, result)

        return result
    }

    private logDecision(agentRole: string, action: string, resource: string, resourceId: string | undefined, result: PolicyCheckResult, matchedRule?: string) {
        // Use the imported singleton
        auditLogger.log({
            agentId: agentRole, // In real usage, this would be actual agent ID
            agentRole,
            action,
            resource,
            resourceId,
            decision: result.allowed ? 'allow' : 'deny',
            matchedRule,
            temporaryGrant: result.isTemporary ? matchedRule : undefined,
            reason: result.reason
        }).catch((err: any) => console.error('[PolicyEngine] Audit log failed:', err))
    }

    private matches(perm: Permission, role: string, action: string, resource: string, resourceId?: string): boolean {
        if (perm.agentRole !== '*' && perm.agentRole !== role) return false
        if (perm.action !== '*' && perm.action !== action) return false
        if (perm.resource !== '*' && perm.resource !== resource) return false

        if (perm.resourcePattern && resourceId) {
            return new RegExp(perm.resourcePattern).test(resourceId)
        }

        return true
    }

    // Helper to map tool calls to policy checks
    matchTool(toolName: string, args: any): { action: ActionType, resource: ResourceType, resourceId?: string } | null {
        switch (toolName) {
            case 'write_file':
            case 'replace_in_file':
            case 'replace_file_content':
            case 'str_replace_editor':
                return { action: 'write', resource: 'file', resourceId: args.path }
            case 'read_file':
            case 'list_dir':
                return { action: 'read', resource: 'file', resourceId: args.path }
            case 'delete_file':
                return { action: 'delete', resource: 'file', resourceId: args.path }
            case 'web_search':
            case 'google_search':
                return { action: 'network', resource: 'web' }
            case 'execute_command':
            case 'start_process': // Map start_process to execute/system
                return { action: 'execute', resource: 'system', resourceId: args.command }
            default:
                return null // No policy for internal/safe tools
        }
    }
}

export const policyEngine = new PolicyEngine()
