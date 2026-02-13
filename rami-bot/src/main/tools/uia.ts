import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * UI Automation Tools for Windows
 * Provides access to the accessibility tree (UIA)
 */

export interface UIElement {
    name: string
    role: string
    x: number
    y: number
    width: number
    height: number
    id?: string
}

/**
 * Get the UI Automation tree for the currently active window or the whole screen
 * @param depth Maximum depth to traverse
 * @returns Array of UI elements
 */
export async function getUITree(depth: number = 2): Promise<{ success: boolean; elements?: UIElement[]; error?: string }> {
    try {
        // Focusing on the active window is much faster and more relevant
        const script = `
            Add-Type -AssemblyName UIAutomationClient
            Add-Type -AssemblyName UIAutomationTypes
            Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();' -Name Win32 -Namespace API

            $hwnd = [API.Win32]::GetForegroundWindow()
            if ($hwnd -eq [IntPtr]::Zero) { 
                $automation = [System.Windows.Automation.AutomationElement]::RootElement
            } else {
                $automation = [System.Windows.Automation.AutomationElement]::FromHandle($hwnd)
            }
            
            $condition = [System.Windows.Automation.Condition]::TrueCondition
            
            # We filter for common interactive elements to keep the tree manageable
            $elements = $automation.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
            
            $results = @()
            foreach ($el in $elements) {
                try {
                    $rect = $el.Current.BoundingRectangle
                    if ($rect.Width -gt 0 -and $rect.Height -gt 0) {
                        $results += @{
                            name = $el.Current.Name
                            role = $el.Current.ControlType.LocalizedControlType
                            x = [int]$rect.X
                            y = [int]$rect.Y
                            width = [int]$rect.Width
                            height = [int]$rect.Height
                            id = $el.Current.AutomationId
                        }
                    }
                } catch {}
                if ($results.Count -gt 150) { break } # Slightly larger limit for rich windows
            }
            $results | ConvertTo-Json
        `

        const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
        if (!stdout || stdout.trim() === '') return { success: true, elements: [] }

        const elements = JSON.parse(stdout)
        // Normalize if single object
        const elementArray = Array.isArray(elements) ? elements : [elements]

        return { success: true, elements: elementArray }
    } catch (error: any) {
        console.error('[UIA] Failed to get UI tree:', error)
        return { success: false, error: error.message }
    }
}
