import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ComputerResult {
  success: boolean
  data?: any
  error?: string
}

// Mouse actions using PowerShell
export async function mouseMove(x: number, y: number): Promise<ComputerResult> {
  try {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
    `
    await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
    return { success: true, data: { x, y } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function mouseClick(button: 'left' | 'right' | 'middle' = 'left', x?: number, y?: number): Promise<ComputerResult> {
  try {
    if (x !== undefined && y !== undefined) {
      await mouseMove(x, y)
    }

    const buttonCode = button === 'left' ? 0x02 : button === 'right' ? 0x08 : 0x20
    const buttonUpCode = button === 'left' ? 0x04 : button === 'right' ? 0x10 : 0x40

    const script = `
      Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);' -Name Win32 -Namespace API
      [API.Win32]::mouse_event(${buttonCode}, 0, 0, 0, 0)
      Start-Sleep -Milliseconds 50
      [API.Win32]::mouse_event(${buttonUpCode}, 0, 0, 0, 0)
    `
    await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
    return { success: true, data: { button } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function mouseDoubleClick(x?: number, y?: number): Promise<ComputerResult> {
  try {
    if (x !== undefined && y !== undefined) {
      await mouseMove(x, y)
    }
    await mouseClick('left')
    await new Promise(r => setTimeout(r, 100))
    await mouseClick('left')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function mouseScroll(amount: number, direction: 'up' | 'down' = 'down'): Promise<ComputerResult> {
  try {
    const scrollAmount = direction === 'up' ? amount : -amount
    const script = `
      Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);' -Name Win32 -Namespace API
      [API.Win32]::mouse_event(0x0800, 0, 0, ${scrollAmount * 120}, 0)
    `
    await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
    return { success: true, data: { amount, direction } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Keyboard actions
export async function typeText(text: string): Promise<ComputerResult> {
  try {
    const escapedText = text.replace(/'/g, "''").replace(/`/g, "``")
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait('${escapedText}')
    `
    await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`, { timeout: 5000 })
    return { success: true, data: { text } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Timeout or error typing text' }
  }
}

export async function pressKey(key: string): Promise<ComputerResult> {
  try {
    // Map common key names to SendKeys format
    const keyMap: Record<string, string> = {
      'enter': '{ENTER}',
      'tab': '{TAB}',
      'escape': '{ESC}',
      'esc': '{ESC}',
      'backspace': '{BACKSPACE}',
      'delete': '{DELETE}',
      'up': '{UP}',
      'down': '{DOWN}',
      'left': '{LEFT}',
      'right': '{RIGHT}',
      'home': '{HOME}',
      'end': '{END}',
      'pageup': '{PGUP}',
      'pagedown': '{PGDN}',
      'f1': '{F1}', 'f2': '{F2}', 'f3': '{F3}', 'f4': '{F4}',
      'f5': '{F5}', 'f6': '{F6}', 'f7': '{F7}', 'f8': '{F8}',
      'f9': '{F9}', 'f10': '{F10}', 'f11': '{F11}', 'f12': '{F12}',
      'space': ' ',
      'ctrl': '^',
      'alt': '%',
      'shift': '+'
    }

    const mappedKey = keyMap[key.toLowerCase()] || key
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait('${mappedKey}')
    `
    await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`, { timeout: 5000 })
    return { success: true, data: { key } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Timeout or error pressing key' }
  }
}

export async function hotkey(keys: string[]): Promise<ComputerResult> {
  try {
    // Convert keys to SendKeys format
    let combo = ''
    for (const key of keys) {
      const lower = key.toLowerCase()
      if (lower === 'ctrl') combo += '^'
      else if (lower === 'alt') combo += '%'
      else if (lower === 'shift') combo += '+'
      else combo += key.toLowerCase()
    }

    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait('${combo}')
    `
    await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`, { timeout: 5000 })
    return { success: true, data: { keys } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Timeout or error sending hotkey' }
  }
}

// Window actions
export async function getActiveWindow(): Promise<ComputerResult> {
  try {
    const script = `
      Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();' -Name Win32 -Namespace API
      Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);' -Name Win32Text -Namespace API
      $hwnd = [API.Win32]::GetForegroundWindow()
      $sb = New-Object System.Text.StringBuilder 256
      [API.Win32Text]::GetWindowText($hwnd, $sb, 256) | Out-Null
      $sb.ToString()
    `
    const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
    return { success: true, data: { title: stdout.trim() } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function focusWindow(title: string): Promise<ComputerResult> {
  try {
    const script = `
      $window = Get-Process | Where-Object { $_.MainWindowTitle -like '*${title}*' } | Select-Object -First 1
      if ($window) {
        Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);' -Name Win32 -Namespace API
        [API.Win32]::SetForegroundWindow($window.MainWindowHandle)
        $true
      } else {
        $false
      }
    `
    const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
    return { success: stdout.trim() === 'True', data: { title } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getMousePosition(): Promise<ComputerResult> {
  try {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      $pos = [System.Windows.Forms.Cursor]::Position
      "$($pos.X),$($pos.Y)"
    `
    const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
    const [x, y] = stdout.trim().split(',').map(Number)
    return { success: true, data: { x, y } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getScreenSize(): Promise<ComputerResult> {
  try {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
      "$($screen.Width),$($screen.Height)"
    `
    const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
    const [width, height] = stdout.trim().split(',').map(Number)
    return { success: true, data: { width, height } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Clipboard
export async function getClipboard(): Promise<ComputerResult> {
  try {
    const { stdout } = await execAsync('powershell -Command "Get-Clipboard"')
    return { success: true, data: { text: stdout.trim() } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function setClipboard(text: string): Promise<ComputerResult> {
  try {
    const escapedText = text.replace(/'/g, "''")
    await execAsync(`powershell -Command "Set-Clipboard -Value '${escapedText}'"`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// System info
export async function getRunningProcesses(): Promise<ComputerResult> {
  try {
    const { stdout } = await execAsync('powershell -Command "Get-Process | Select-Object -First 50 Name, Id, CPU, WorkingSet | ConvertTo-Json"')
    return { success: true, data: JSON.parse(stdout) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function killProcess(processName: string): Promise<ComputerResult> {
  try {
    await execAsync(`powershell -Command "Stop-Process -Name '${processName}' -Force -ErrorAction SilentlyContinue"`)
    return { success: true, data: { killed: processName } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function startProcess(command: string): Promise<ComputerResult> {
  try {
    await execAsync(`start "" "${command}"`)
    return { success: true, data: { started: command } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function mouseDrag(fromX: number, fromY: number, toX: number, toY: number): Promise<ComputerResult> {
  try {
    const script = `
      Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);' -Name Win32 -Namespace API
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${fromX}, ${fromY})
      [API.Win32]::mouse_event(0x02, 0, 0, 0, 0)
      Start-Sleep -Milliseconds 100
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${toX}, ${toY})
      Start-Sleep -Milliseconds 100
      [API.Win32]::mouse_event(0x04, 0, 0, 0, 0)
    `
    await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
    return { success: true, data: { fromX, fromY, toX, toY } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
