/**
 * PII Redaction Utilities
 * Detects and masks sensitive information in text
 */

export interface RedactionResult {
    redacted: string
    hasPII: boolean
    patterns: string[]
}

export class PIIRedactor {
    private patterns = {
        email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
        ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
        creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
        apiKey: /\b[A-Za-z0-9_-]{20,}\b/g // Simple heuristic
    }

    redact(text: string): RedactionResult {
        let redacted = text
        const foundPatterns: string[] = []

        // Email
        if (this.patterns.email.test(text)) {
            redacted = redacted.replace(this.patterns.email, '[EMAIL REDACTED]')
            foundPatterns.push('email')
        }

        // Phone
        if (this.patterns.phone.test(text)) {
            redacted = redacted.replace(this.patterns.phone, '[PHONE REDACTED]')
            foundPatterns.push('phone')
        }

        // SSN
        if (this.patterns.ssn.test(text)) {
            redacted = redacted.replace(this.patterns.ssn, '[SSN REDACTED]')
            foundPatterns.push('ssn')
        }

        // Credit Card
        if (this.patterns.creditCard.test(text)) {
            redacted = redacted.replace(this.patterns.creditCard, '[CARD REDACTED]')
            foundPatterns.push('creditCard')
        }

        // IP Address
        if (this.patterns.ipAddress.test(text)) {
            redacted = redacted.replace(this.patterns.ipAddress, '[IP REDACTED]')
            foundPatterns.push('ip')
        }

        // API Keys (be cautious with this one)
        const suspectedKeys = text.match(this.patterns.apiKey)
        if (suspectedKeys && suspectedKeys.some(k => k.length > 30)) {
            redacted = redacted.replace(this.patterns.apiKey, '[API_KEY REDACTED]')
            foundPatterns.push('apiKey')
        }

        return {
            redacted,
            hasPII: foundPatterns.length > 0,
            patterns: foundPatterns
        }
    }
}

export const piiRedactor = new PIIRedactor()
