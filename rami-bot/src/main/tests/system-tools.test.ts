import { describe, it, expect, vi } from 'vitest'
import { toolExecutor } from '../tools/tool-executor'
import * as systemInfo from '../tools/system-info'

// Mock system-info
vi.mock('../tools/system-info', () => ({
    getSystemInfo: vi.fn(),
    getCurrentTime: vi.fn(),
    getDiskSpace: vi.fn(),
    getNetworkInfo: vi.fn(),
    getBatteryInfo: vi.fn(),
    getInstalledApps: vi.fn(),
    getWifiNetworks: vi.fn(),
    getWeather: vi.fn(),
    getEnvironmentVariables: vi.fn()
}))

describe('System Info Tools Integration', () => {

    it('should expose get_system_info', async () => {
        await toolExecutor.executeTool('get_system_info', {})
        expect(systemInfo.getSystemInfo).toHaveBeenCalled()
    })

    it('should expose get_disk_space', async () => {
        await toolExecutor.executeTool('get_disk_space', {})
        expect(systemInfo.getDiskSpace).toHaveBeenCalled()
    })

    it('should expose get_weather', async () => {
        await toolExecutor.executeTool('get_weather', { city: 'London' })
        expect(systemInfo.getWeather).toHaveBeenCalledWith('London')
    })
})
