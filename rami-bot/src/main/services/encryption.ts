import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

/**
 * Encryption Service for Sovereign Mode
 * AES-256-GCM encryption for sensitive data
 */

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16

export interface EncryptedData {
    encrypted: string // Base64
    iv: string // Base64
    authTag: string // Base64
}

export class EncryptionService {
    private encryptionKey: Buffer | null = null
    private keyPath: string

    constructor() {
        const userDataPath = app?.getPath('userData') || '.'
        this.keyPath = path.join(userDataPath, '.sovereign', 'encryption.key')
    }

    /**
     * Initialize or load encryption key
     */
    async initialize(): Promise<void> {
        try {
            // Try to load existing key
            const keyData = await fs.readFile(this.keyPath)
            this.encryptionKey = Buffer.from(keyData)
            console.log('[Encryption] Loaded existing key')
        } catch {
            // Generate new key
            this.encryptionKey = crypto.randomBytes(KEY_LENGTH)
            await fs.mkdir(path.dirname(this.keyPath), { recursive: true })
            await fs.writeFile(this.keyPath, this.encryptionKey)
            await fs.chmod(this.keyPath, 0o600) // Owner read/write only
            console.log('[Encryption] Generated new encryption key')
        }
    }

    /**
     * Encrypt data
     */
    encrypt(plaintext: string): EncryptedData {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not initialized')
        }

        const iv = crypto.randomBytes(IV_LENGTH)
        const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv)

        let encrypted = cipher.update(plaintext, 'utf8', 'base64')
        encrypted += cipher.final('base64')

        const authTag = cipher.getAuthTag()

        return {
            encrypted,
            iv: iv.toString('base64'),
            authTag: authTag.toString('base64')
        }
    }

    /**
     * Decrypt data
     */
    decrypt(data: EncryptedData): string {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not initialized')
        }

        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            this.encryptionKey,
            Buffer.from(data.iv, 'base64')
        )

        decipher.setAuthTag(Buffer.from(data.authTag, 'base64'))

        let decrypted = decipher.update(data.encrypted, 'base64', 'utf8')
        decrypted += decipher.final('utf8')

        return decrypted
    }

    /**
     * Encrypt a file
     */
    async encryptFile(filePath: string): Promise<void> {
        const plaintext = await fs.readFile(filePath, 'utf8')
        const encrypted = this.encrypt(plaintext)
        await fs.writeFile(filePath + '.enc', JSON.stringify(encrypted))
        console.log(`[Encryption] Encrypted ${filePath}`)
    }

    /**
     * Decrypt a file
     */
    async decryptFile(encryptedPath: string): Promise<string> {
        const data = JSON.parse(await fs.readFile(encryptedPath, 'utf8'))
        return this.decrypt(data)
    }
}

export const encryptionService = new EncryptionService()
