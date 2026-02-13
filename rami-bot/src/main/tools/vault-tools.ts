import { vaultManager, VaultSecret } from '../utils/vault-manager'
import { synergyManager } from '../organization/synergy-manager'

/**
 * VaultTools: Specialized tools for agents to interact with the secure vault.
 * CRITICAL: Always requires explicit user (CEO) approval.
 */
export const vaultTools = {
    /**
     * Lists available secrets in the vault (names and types only)
     */
    listSecrets: async () => {
        try {
            const secrets = await vaultManager.listSecrets()
            return secrets.map(s => ({ id: s.id, name: s.name, type: s.type }))
        } catch (error: any) {
            return { error: error.message }
        }
    },

    /**
     * Requests a secret from the vault.
     * This WILL trigger a CEO decision prompt.
     */
    requestSecret: async (secretId: string, reason: string): Promise<any> => {
        try {
            const secrets = await vaultManager.listSecrets()
            const secret = secrets.find(s => s.id === secretId)

            if (!secret) throw new Error(`Secret with ID ${secretId} not found`)

            // Ask CEO for permission
            const approved = await synergyManager.requestDecision({
                type: 'vault_access',
                title: 'Unlock Secure Vault Item',
                description: `An agent is requesting access to "${secret.name}" (${secret.type}).\n\nReason: ${reason}`,
                requesterId: 'agent',
                data: { secretId, secretName: secret.name, secretType: secret.type },
                priority: 'high'
            })

            if (approved.status !== 'approved') {
                throw new Error('Access to vault item was denied by user.')
            }

            // Decrypt and return the secret
            return await vaultManager.getSecret(secretId)
        } catch (error: any) {
            return { error: error.message }
        }
    }
}
