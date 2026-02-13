import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'

// Allowed base directories for file operations (security)
const ALLOWED_BASE_DIRS: string[] = [
  process.cwd(),                              // Project directory
  process.env.USER_DATA_PATH || '',           // App user data
  process.env.HOME || process.env.USERPROFILE || '',  // User home
]

/**
 * Validate that a path is within allowed directories
 */
function validatePath(filePath: string): { valid: boolean; error?: string } {
  const resolved = path.resolve(filePath)

  // Check if path starts with any allowed base directory
  const isAllowed = ALLOWED_BASE_DIRS.some(baseDir => {
    if (!baseDir) return false
    return resolved.startsWith(baseDir + path.sep) || resolved === baseDir
  })

  if (!isAllowed) {
    return {
      valid: false,
      error: `Access denied: Path '${filePath}' is outside allowed directories`
    }
  }

  // Additional check: block path traversal attempts
  if (filePath.includes('..') || path.resolve(filePath) !== resolved) {
    return {
      valid: false,
      error: `Access denied: Path traversal detected in '${filePath}'`
    }
  }

  return { valid: true }
}

export interface FileEditorParams {
  command: 'view' | 'create' | 'str_replace' | 'insert'
  path: string
  file_text?: string
  old_str?: string
  new_str?: string
  insert_line?: number
  view_range?: [number, number]
}

export interface FileEditorResult {
  success: boolean
  data?: string
  error?: string
}

export async function fileEditor(params: FileEditorParams): Promise<FileEditorResult> {
  const { command, path: filePath } = params

  // Validate path before any operation
  const pathValidation = validatePath(filePath)
  if (!pathValidation.valid) {
    return { success: false, error: pathValidation.error }
  }

  try {
    switch (command) {
      case 'view':
        return await viewFile(filePath, params.view_range)

      case 'create':
        if (!params.file_text) {
          return { success: false, error: 'file_text is required for create command' }
        }
        return await createFile(filePath, params.file_text)

      case 'str_replace':
        if (!params.old_str || params.new_str === undefined) {
          return { success: false, error: 'old_str and new_str are required for str_replace command' }
        }
        return await strReplace(filePath, params.old_str, params.new_str)

      case 'insert':
        if (params.insert_line === undefined || !params.new_str) {
          return { success: false, error: 'insert_line and new_str are required for insert command' }
        }
        return await insertLine(filePath, params.insert_line, params.new_str)

      default:
        return { success: false, error: `Unknown command: ${command}` }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function viewFile(filePath: string, viewRange?: [number, number]): Promise<FileEditorResult> {
  const content = await fs.readFile(filePath, 'utf-8')
  const lines = content.split('\n')

  if (viewRange) {
    const [start, end] = viewRange
    const selectedLines = lines.slice(start - 1, end)
    const numberedLines = selectedLines.map((line, i) => `${start + i}: ${line}`)
    return { success: true, data: numberedLines.join('\n') }
  }

  const numberedLines = lines.map((line, i) => `${i + 1}: ${line}`)
  return { success: true, data: numberedLines.join('\n') }
}

async function createFile(filePath: string, content: string): Promise<FileEditorResult> {
  // Ensure directory exists
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })

  await fs.writeFile(filePath, content, 'utf-8')
  return { success: true, data: `File created: ${filePath}` }
}

async function strReplace(filePath: string, oldStr: string, newStr: string): Promise<FileEditorResult> {
  const content = await fs.readFile(filePath, 'utf-8')

  if (!content.includes(oldStr)) {
    return { success: false, error: 'old_str not found in file' }
  }

  // Check for multiple occurrences
  const occurrences = content.split(oldStr).length - 1
  if (occurrences > 1) {
    return {
      success: false,
      error: `Found ${occurrences} occurrences of old_str. Please provide more context for unique match.`
    }
  }

  const newContent = content.replace(oldStr, newStr)
  await fs.writeFile(filePath, newContent, 'utf-8')

  return { success: true, data: 'Replacement successful' }
}

async function insertLine(filePath: string, lineNumber: number, text: string): Promise<FileEditorResult> {
  const content = await fs.readFile(filePath, 'utf-8')
  const lines = content.split('\n')

  if (lineNumber < 1 || lineNumber > lines.length + 1) {
    return { success: false, error: `Invalid line number: ${lineNumber}` }
  }

  lines.splice(lineNumber - 1, 0, text)
  await fs.writeFile(filePath, lines.join('\n'), 'utf-8')

  return { success: true, data: `Inserted at line ${lineNumber}` }
}
