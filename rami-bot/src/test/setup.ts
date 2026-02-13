import { vi } from 'vitest'

// Mock Electron app to avoid getPath errors globally
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('./temp/userData'),
        on: vi.fn(),
        isReady: vi.fn().mockReturnValue(true),
    },
    ipcMain: {
        on: vi.fn(),
        handle: vi.fn(),
        removeHandler: vi.fn(),
    },
    BrowserWindow: {
        getAllWindows: vi.fn().mockReturnValue([]),
    },
    shell: {
        openExternal: vi.fn(),
    },
}))

// Mock other common global dependencies if needed
vi.mock('fs/promises', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs/promises')>()
    return {
        ...actual,
        readFile: vi.fn().mockImplementation(async (path, options) => {
            if (path.includes('package.json')) return JSON.stringify({ version: '1.0.0' })
            return actual.readFile(path, options)
        }),
    }
})
