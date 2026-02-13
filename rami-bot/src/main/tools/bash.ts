import { exec } from 'child_process'
import { promisify } from 'util'
import * as os from 'os'

const execAsync = promisify(exec)

// Allowlist of safe commands for security
const ALLOWED_COMMANDS = [
  // File operations
  'ls', 'dir', 'cat', 'type', 'head', 'tail', 'wc', 'find', 'grep', 'findstr',
  // System info
  'whoami', 'hostname', 'uname', 'date', 'time', 'uptime',
  // Process management
  'ps', 'tasklist', 'kill', 'pkill',
  // Network
  'ping', 'curl', 'wget', 'ipconfig', 'ifconfig', 'netstat',
  // Git operations
  'git',
  // Node/npm
  'node', 'npm', 'npx',
  // Text processing
  'sed', 'awk', 'sort', 'uniq', 'cut', 'tr', 'jq',
  // Archive
  'tar', 'zip', 'unzip',
  // Directory
  'cd', 'pwd', 'mkdir', 'rm', 'cp', 'copy', 'move', 'del', 'rmdir',
  // System execution
  'start', 'cmd', 'powershell', 'echo'
]

// Dangerous patterns to block
const BLOCKED_PATTERNS = [
  // Block highly dangerous patterns, but allow common chaining
  /\\\\\.\./,      // Escaping
  /\$\(.*\)/,      // Command substitution
]

export interface BashResult {
  success: boolean
  output?: string
  error?: string
}

/**
 * Sanitize and validate command before execution
 */
function sanitizeCommand(command: string): { valid: boolean; error?: string } {
  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return { valid: false, error: `Command contains blocked pattern: ${pattern}` }
    }
  }

  // Extract the base command (first word)
  const baseCommand = command.trim().split(/\s+/)[0].toLowerCase()

  // Check if command is in allowlist or starts with a safe prefix
  const isAllowed = ALLOWED_COMMANDS.some(allowed => {
    if (baseCommand === allowed) return true

    // Windows command variations (e.g. 'ipconfig.exe')
    if (baseCommand === allowed + '.exe') return true

    // Allow commands that start with allowed commands (e.g., 'git status')
    if (baseCommand.startsWith(allowed + ' ') || baseCommand.startsWith(allowed + '-')) return true
    return false
  })

  if (!isAllowed) {
    return { valid: false, error: `Command '${baseCommand}' is not in the allowed list` }
  }

  return { valid: true }
}

export async function executeCommand(
  command: string,
  timeout: number = 30000,
  _options?: { allowUnsafe?: boolean }
): Promise<BashResult> {
  const isWindows = os.platform() === 'win32'

  const shell = isWindows ? 'cmd.exe' : '/bin/bash'
  const shellArgs = isWindows ? ['/c'] : ['-c']

  // Validate command before execution
  const validation = sanitizeCommand(command)
  if (!validation.valid) {
    console.warn(`[Bash] Blocked unsafe command: ${command}`)
    return { success: false, error: validation.error || 'Command validation failed' }
  }

  try {
    console.log('[Bash] Executing:', command)

    const { stdout, stderr } = await execAsync(command, {
      timeout,
      shell,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      windowsHide: true
    })

    const output = stdout || stderr
    console.log('[Bash] Output:', output.substring(0, 200))

    return {
      success: true,
      output: output.trim()
    }
  } catch (error: any) {
    console.error('[Bash] Error:', error.message)

    // Check if it's a timeout
    if (error.killed) {
      return {
        success: false,
        error: `Command timed out after ${timeout}ms`
      }
    }

    // Return stderr if available
    if (error.stderr) {
      return {
        success: false,
        error: error.stderr
      }
    }

    return {
      success: false,
      error: error.message
    }
  }
}

export async function getSystemInfo(): Promise<Record<string, string>> {
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    homedir: os.homedir(),
    tmpdir: os.tmpdir(),
    shell: process.env.SHELL || process.env.COMSPEC || 'unknown'
  }
}
