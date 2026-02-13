/// <reference types="vite/client" />

interface Window {
    electron: {
        ipcRenderer: {
            send(channel: string, ...args: any[]): void
            on(channel: string, func: (...args: any[]) => void): () => void
            once(channel: string, func: (...args: any[]) => void): void
            invoke(channel: string, ...args: any[]): Promise<any>
            removeAllListeners(channel: string): void
        }
        invoke: (channel: string, ...args: any[]) => Promise<any>
        // Core
        invoke: (channel: string, ...args: any[]) => Promise<any>

        // Window
        minimize: () => void
        maximize: () => void
        close: () => void
        toggleFullscreen: () => void
        openLogs: () => void

        // Settings
        loadSettings: () => Promise<any>
        saveSettings: (settings: any) => Promise<void>
        testLLMConnection: (provider: string, config?: any) => Promise<{ success: boolean; message: string; latency?: number }>
        testAllLLMConnections: () => Promise<Record<string, { success: boolean; message: string; latency?: number }>>

        // Telegram
        telegramConnect: (token: string) => Promise<boolean>
        telegramDisconnect: () => Promise<boolean>
        telegramGetStatus: () => Promise<string>
        telegramGetMessages: (chatId: string) => Promise<any[]>
        telegramSendMessage: (chatId: string, text: string) => Promise<any>
        onTelegramStatusChanged: (callback: (status: string) => void) => () => void

        // Agent
        processMessage: (message: string, chatId: string, platform: string) => Promise<string>
        onAgentActivity: (callback: (activity: any) => void) => () => void
        getAgents: () => Promise<any[]>
        saveAgent: (agent: any) => Promise<void>
        deleteAgent: (id: string) => Promise<void>
        startCollaboration: (agentIds: string[], task: string) => Promise<any>

        // Tools
        executeBash: (command: string, timeout?: number) => Promise<any>
        fileEditor: (params: any) => Promise<any>
        webSearch: (query: string, maxResults?: number) => Promise<any>
        openBrowser: (url: string) => Promise<void>
        openExternal: (url: string) => void
        googleSearch: (query: string) => Promise<any>
        downloadFile: (url: string, filename?: string, outputDir?: string) => Promise<string>

        // Vision
        takeScreenshot: () => Promise<string>
        readClipboardImage: () => Promise<string>

        // Voice & Speech
        speak: (text: string, options?: any) => Promise<any>
        getVoices: () => Promise<{ success: boolean; data: any[]; error?: string }>
        speakToFile: (text: string, outputPath?: string, options?: any) => Promise<{ success: boolean; error?: string }>
        stopSpeaking: () => Promise<{ success: boolean }>
        listen: (duration?: number) => Promise<{ text: string }>
        readClipboardAloud: () => Promise<{ success: boolean; data?: any; error?: string }>

        // Learning & Memory
        getLearningStats: () => Promise<any>
        recallMemories: (query: string, options?: any) => Promise<any[]>
        teachFact: (fact: string) => Promise<boolean>
        forgetMemory: (id: string) => Promise<boolean>
        ingestDocument: (filePath: string) => Promise<{ success: boolean; learnedCount?: number; error?: string }>
        onLearningComplete: (callback: (data: any) => void) => () => void

        // Services
        listServices: () => Promise<any[]>
        createService: (config: any) => Promise<any>
        startService: (id: string) => Promise<boolean>
        stopService: (id: string) => Promise<boolean>
        deleteService: (id: string) => Promise<boolean>
        getServiceInfo: (id: string) => Promise<any>
        getCoreStatus: () => Promise<any>
        remoteStart: (port: number) => Promise<any>
        remoteStop: () => Promise<void>
        localAPIStart: (port: number) => Promise<any>
        localAPIStop: () => Promise<void>
        createDemoService: () => Promise<any>

        // Synergy
        getSynergyStatus: () => Promise<any>
        getSynergyDashboard: () => Promise<any>
        startSynergy: () => Promise<boolean>
        stopSynergy: () => Promise<boolean>
        createTask: (config: any) => Promise<any>
        ceoRespond: (decisionId: string, approved: boolean, comment?: string) => Promise<boolean>
        getAgents: () => Promise<any[]>
        onOrgUpdate: (callback: (data: any) => void) => () => void

        // Skills
        getSkills: () => Promise<any[]>
        saveSkill: (skill: any) => Promise<boolean>
        deleteSkill: (id: string) => Promise<boolean>
        toggleSkill: (id: string) => Promise<boolean>
        importSkill: (path: string) => Promise<void>
        exportSkill: (id: string, path: string) => Promise<any>

        // Dialogs
        showOpenDialog: (options: any) => Promise<any>
        showSaveDialog: (options: any) => Promise<any>

        // Workflow
        listWorkflows: () => Promise<any[]>
        createWorkflow: (config: any) => Promise<any>
        runWorkflow: (workflowId: string, input?: any) => Promise<any>
        getWorkflowTemplates: () => Promise<any[]>

        // Email
        sendGmail: (to: string, subject: string, body: string, options?: any) => Promise<any>
        listGmail: (options?: any) => Promise<any[]>
        getGmailMessage: (messageId: string) => Promise<any>
        searchGmail: (query: string) => Promise<any[]>

        // Signal
        signalStart: (phoneNumber: string) => Promise<any>
        signalStop: () => Promise<boolean>
        signalSend: (recipient: string, message: string) => Promise<any>
        signalGetStatus: () => Promise<any>

        // Integration
        testIntegration: (id: string) => Promise<{ success: boolean; message?: string }>

        // Cron
        listCronTasks: () => Promise<any[]>
        createCronTask: (task: { name: string; schedule: string; command: string }) => Promise<any>
        deleteCronTask: (id: string) => Promise<boolean>
        toggleCronTask: (id: string, enabled: boolean) => Promise<boolean>

        // App Controls
        saveChat: () => Promise<boolean>
        toggleDevTools: () => void
        exportSettings: (path: string) => Promise<void>
        importSettings: (path: string) => Promise<void>

        // Events
        // Analytics & Stats
        getAnalytics: () => Promise<any>
        getVectorStats: () => Promise<any>
        getGlobalStats: () => Promise<any>
        getAgentMetrics: () => Promise<any[]>
        getCollaborationGraph: () => Promise<any>
        getAllProfiles: () => Promise<any[]>

        // Global Planning
        previewProject: (objective: string) => Promise<any>
        createProjectFromPlan: (plan: any) => Promise<string>

        on: (channel: string, callback: (...args: any[]) => void) => () => void
        off: (channel: string, callback: (...args: any[]) => void) => void
    }
}
