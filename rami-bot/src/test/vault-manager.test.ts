import { describe, it, expect, beforeEach, vi } from 'vitest'
import { vaultManager } from '../main/utils/vault-manager'

// Mock Electron SafeStorage
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('./mock-user-data')
    },
    safeStorage: {
        isEncryptionAvailable: vi.fn().mockReturnValue(true),
        encryptString: vi.fn().mockImplementation((str) => Buffer.from(str).reverse()),
        decryptString: vi.fn().mockImplementation((buf) => buf.reverse().toString())
    }
}))

// Mock FS
vi.mock('fs/promises', () => ({
    mkdir: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockRejectedValue({ code: 'ENOENT' }),
    writeFile: vi.fn().mockResolvedValue(undefined)
}))

describe('VaultManager', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        // Reset singleton state if possible or use a fresh instance logic
        // For now we assume a clean state due to mocks
        vaultManager['secrets'].clear()
        vaultManager['initialized'] = false
    })

    it('should store and retrieve a password secret', async () => {
        const passwordData = { username: 'testuser', password: 'securepassword', url: 'https://example.com' }
        const id = await vaultManager.storeSecret('Test Password', 'password', passwordData)

        expect(id).toBeDefined()

        const decrypted = await vaultManager.getSecret(id)
        expect(decrypted).toEqual(passwordData)
    })

    it('should list secrets without exposing encrypted data', async () => {
        await vaultManager.storeSecret('P1', 'password', { p: '1' })
        await vaultManager.storeSecret('C1', 'credit_card', { c: '1' })

        const list = await vaultManager.listSecrets()
        expect(list.length).toBe(2)
        expect(list[0]).not.toHaveProperty('encryptedData')
        expect(list[0].name).toBe('P1')
    })

    it('should delete secrets correctly', async () => {
        const id = await vaultManager.storeSecret('Delete Me', 'password', { x: 1 })
        let list = await vaultManager.listSecrets()
        expect(list.length).toBe(1)

        const deleted = await vaultManager.deleteSecret(id)
        expect(deleted).toBe(true)

        list = await vaultManager.listSecrets()
        expect(list.length).toBe(0)
    })

    it('should throw error if secret not found', async () => {
        await expect(vaultManager.getSecret('non-existent')).rejects.toThrow('not found')
    })
})
