import { app, safeStorage } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

export type SecretType = 'password' | 'credit_card' | 'other'

export interface VaultSecret {
    id: string
    name: string
    type: SecretType
    encryptedData: string // Base64 encrypted string
    createdAt: number
    updatedAt: number
    metadata?: Record<string, any>
}

export interface PasswordData {
    username: string
    password: string
    url?: string
}

export interface CreditCardData {
    cardNumber: string
    expiryDate: string
    cvv: string
    cardholderName: string
}

const VAULT_FILE = 'vault.json'
const CONFIG_DIR = 'config'

/**
 * VaultManager: Manages hardware-encrypted storage for sensitive credentials.
 * Uses Electron's safeStorage API.
 */
class VaultManager {
    private secrets: Map<string, VaultSecret> = new Map()
    private vaultPath: string = ''
    private initialized = false

    async initialize(): Promise<void> {
        if (this.initialized) return

        const configPath = path.join(app.getPath('userData'), CONFIG_DIR)
        this.vaultPath = path.join(configPath, VAULT_FILE)

        try {
            await fs.mkdir(configPath, { recursive: true })
            await this.loadVault()
        } catch (error: any) {
            console.error('[Vault] Failed to initialize:', error.message)
        }

        this.initialized = true
    }

    private async loadVault(): Promise<void> {
        try {
            const content = await fs.readFile(this.vaultPath, 'utf-8')
            const data: VaultSecret[] = JSON.parse(content)
            this.secrets = new Map(data.map(s => [s.id, s]))
            console.log(`[Vault] Loaded ${this.secrets.size} secrets`)
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.error('[Vault] Error loading vault file:', error.message)
            }
        }
    }

    private async saveVault(): Promise<void> {
        const data = Array.from(this.secrets.values())
        await fs.writeFile(this.vaultPath, JSON.stringify(data, null, 2), 'utf-8')
    }

    /**
     * Stores a secret in the vault
     */
    async storeSecret(name: string, type: SecretType, data: any, metadata?: Record<string, any>): Promise<string> {
        if (!this.initialized) await this.initialize()

        if (!safeStorage.isEncryptionAvailable()) {
            throw new Error('Encryption is not available on this system')
        }

        const jsonString = JSON.stringify(data)
        const encryptedBuffer = safeStorage.encryptString(jsonString)
        const encryptedData = encryptedBuffer.toString('base64')

        const id = uuidv4()
        const now = Date.now()
        const secret: VaultSecret = {
            id,
            name,
            type,
            encryptedData,
            createdAt: now,
            updatedAt: now,
            metadata
        }

        this.secrets.set(id, secret)
        await this.saveVault()
        return id
    }

    /**
     * Retrieves and decrypts a secret
     */
    async getSecret(id: string): Promise<any> {
        if (!this.initialized) await this.initialize()

        const secret = this.secrets.get(id)
        if (!secret) throw new Error(`Secret with ID ${id} not found`)

        if (!safeStorage.isEncryptionAvailable()) {
            throw new Error('Encryption is not available on this system')
        }

        const encryptedBuffer = Buffer.from(secret.encryptedData, 'base64')
        const decryptedString = safeStorage.decryptString(encryptedBuffer)
        return JSON.parse(decryptedString)
    }

    /**
     * Lists all secrets (without sensitive data)
     */
    async listSecrets(): Promise<Omit<VaultSecret, 'encryptedData'>[]> {
        if (!this.initialized) await this.initialize()

        return Array.from(this.secrets.values()).map(({ encryptedData, ...rest }) => rest)
    }

    /**
     * Deletes a secret
     */
    async deleteSecret(id: string): Promise<boolean> {
        if (!this.initialized) await this.initialize()

        const deleted = this.secrets.delete(id)
        if (deleted) {
            await this.saveVault()
        }
        return deleted
    }

    /**
     * Updates metadata for a secret
     */
    async updateMetadata(id: string, metadata: Record<string, any>): Promise<void> {
        if (!this.initialized) await this.initialize()

        const secret = this.secrets.get(id)
        if (!secret) throw new Error(`Secret with ID ${id} not found`)

        secret.metadata = { ...secret.metadata, ...metadata }
        secret.updatedAt = Date.now()
        await this.saveVault()
    }
}

export const vaultManager = new VaultManager()
