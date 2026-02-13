import * as os from 'os'
import * as fs from 'fs/promises'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface SystemInfoResult {
  success: boolean
  data?: any
  error?: string
}

export async function getSystemInfo(): Promise<SystemInfoResult> {
  try {
    const info = {
      platform: os.platform(),
      type: os.type(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || 'Unknown',
      homeDir: os.homedir(),
      tempDir: os.tmpdir(),
      username: os.userInfo().username
    }
    return { success: true, data: info }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getDiskSpace(): Promise<SystemInfoResult> {
  try {
    const { stdout } = await execAsync('wmic logicaldisk get caption,freespace,size /format:csv')
    const lines = stdout.trim().split('\n').filter(l => l.trim())
    const disks = lines.slice(1).map(line => {
      const parts = line.split(',')
      return {
        drive: parts[1],
        freeSpace: parseInt(parts[2]) || 0,
        totalSize: parseInt(parts[3]) || 0
      }
    }).filter(d => d.drive)
    return { success: true, data: disks }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getNetworkInfo(): Promise<SystemInfoResult> {
  try {
    const interfaces = os.networkInterfaces()
    const networks: any[] = []
    
    for (const [name, addrs] of Object.entries(interfaces)) {
      if (addrs) {
        for (const addr of addrs) {
          if (addr.family === 'IPv4' && !addr.internal) {
            networks.push({
              name,
              address: addr.address,
              netmask: addr.netmask,
              mac: addr.mac
            })
          }
        }
      }
    }
    return { success: true, data: networks }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getBatteryInfo(): Promise<SystemInfoResult> {
  try {
    const { stdout } = await execAsync('powershell -Command "Get-WmiObject Win32_Battery | Select-Object EstimatedChargeRemaining, BatteryStatus | ConvertTo-Json"')
    const data = JSON.parse(stdout || '{}')
    return { 
      success: true, 
      data: {
        chargePercent: data.EstimatedChargeRemaining || 100,
        isCharging: data.BatteryStatus === 2,
        status: data.BatteryStatus
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getInstalledApps(): Promise<SystemInfoResult> {
  try {
    const { stdout } = await execAsync('powershell -Command "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, DisplayVersion, Publisher | Where-Object { $_.DisplayName } | Select-Object -First 100 | ConvertTo-Json"')
    return { success: true, data: JSON.parse(stdout || '[]') }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getStartupApps(): Promise<SystemInfoResult> {
  try {
    const { stdout } = await execAsync('powershell -Command "Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location | ConvertTo-Json"')
    return { success: true, data: JSON.parse(stdout || '[]') }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getEnvironmentVariables(): Promise<SystemInfoResult> {
  try {
    return { success: true, data: process.env }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function setEnvironmentVariable(name: string, value: string): Promise<SystemInfoResult> {
  try {
    process.env[name] = value
    await execAsync(`setx ${name} "${value}"`)
    return { success: true, data: { name, value } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getWifiNetworks(): Promise<SystemInfoResult> {
  try {
    const { stdout } = await execAsync('netsh wlan show networks mode=bssid')
    return { success: true, data: stdout }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getCurrentTime(): Promise<SystemInfoResult> {
  const now = new Date()
  return {
    success: true,
    data: {
      iso: now.toISOString(),
      local: now.toLocaleString(),
      timestamp: now.getTime(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      offset: now.getTimezoneOffset()
    }
  }
}

export async function getWeather(city?: string): Promise<SystemInfoResult> {
  try {
    // Using wttr.in for simple weather
    const location = city || ''
    const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`)
    const data = await response.json()
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
