import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.{test,spec}.{ts,mts,cts,tsx}'],
        testTimeout: 30000, // Increase timeout for LLM tests
        env: {
            // Fix for "spawn cmd.exe ENOENT" error in Windows
            ComSpec: 'C:\\Windows\\System32\\cmd.exe',
            SystemRoot: 'C:\\Windows',
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
})
