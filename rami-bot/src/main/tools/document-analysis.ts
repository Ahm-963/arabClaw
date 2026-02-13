/**
 * Document Analysis Tool
 * Analyze PDFs, Word docs, Excel, RFPs, contracts, and more
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { app } from 'electron'

const execAsync = promisify(exec)

export interface DocumentInfo {
  path: string
  name: string
  type: string
  size: number
  pages?: number
  wordCount?: number
  createdAt?: Date
  modifiedAt?: Date
}

export interface AnalysisResult {
  success: boolean
  documentInfo: DocumentInfo
  content?: string
  summary?: string
  keyPoints?: string[]
  entities?: ExtractedEntity[]
  sections?: DocumentSection[]
  metadata?: Record<string, any>
  error?: string
}

export interface ExtractedEntity {
  type: 'person' | 'organization' | 'date' | 'money' | 'percentage' | 'email' | 'phone' | 'url' | 'address'
  value: string
  context?: string
}

export interface DocumentSection {
  title: string
  content: string
  level: number
  pageNumber?: number
}

export interface RFPAnalysis {
  title: string
  issuingOrganization?: string
  submissionDeadline?: string
  budget?: string
  scope: string[]
  requirements: string[]
  evaluationCriteria: string[]
  deliverables: string[]
  timeline?: string[]
  contactInfo?: string
  keyDates: { event: string; date: string }[]
  mandatoryRequirements: string[]
  qualifications: string[]
  questions: string[]
}

// Get file extension
function getFileType(filePath: string): string {
  return path.extname(filePath).toLowerCase().slice(1)
}

// Read text file
async function readTextFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8')
}

// Extract text from PDF using PowerShell and Windows APIs
async function extractPdfText(filePath: string): Promise<string> {
  try {
    // Try using PowerShell with iTextSharp or similar
    const script = `
      Add-Type -Path "$env:USERPROFILE\\.nuget\\packages\\itextsharp\\*\\lib\\net40\\itextsharp.dll" -ErrorAction SilentlyContinue
      
      if ([System.Type]::GetType('iTextSharp.text.pdf.PdfReader')) {
        $reader = New-Object iTextSharp.text.pdf.PdfReader("${filePath.replace(/\\/g, '\\\\')}")
        $text = ""
        for ($i = 1; $i -le $reader.NumberOfPages; $i++) {
          $text += [iTextSharp.text.pdf.parser.PdfTextExtractor]::GetTextFromPage($reader, $i)
          $text += "\\n\\n--- Page $i ---\\n\\n"
        }
        $reader.Close()
        $text
      } else {
        # Fallback: Use Windows built-in PDF handling
        $shell = New-Object -ComObject Shell.Application
        $folder = $shell.Namespace((Split-Path "${filePath.replace(/\\/g, '\\\\')}"))
        $file = $folder.ParseName((Split-Path "${filePath.replace(/\\/g, '\\\\')}" -Leaf))
        "PDF file detected. Install pdf-parse or iTextSharp for full text extraction."
      }
    `
    
    const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
    return stdout.trim()
  } catch (error) {
    // Fallback method using Python if available
    try {
      const pythonScript = `
import sys
try:
    import PyPDF2
    with open(r'${filePath}', 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        text = ''
        for i, page in enumerate(reader.pages):
            text += page.extract_text() or ''
            text += f'\\n\\n--- Page {i+1} ---\\n\\n'
        print(text)
except ImportError:
    print('PyPDF2 not installed. Run: pip install PyPDF2')
except Exception as e:
    print(f'Error: {e}')
`
      const { stdout } = await execAsync(`python -c "${pythonScript.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`)
      return stdout
    } catch {
      return `[PDF file: ${path.basename(filePath)}. Install PyPDF2 (pip install PyPDF2) or provide the text content directly for analysis.]`
    }
  }
}

// Extract text from Word documents
async function extractWordText(filePath: string): Promise<string> {
  try {
    const script = `
      $word = New-Object -ComObject Word.Application
      $word.Visible = $false
      $doc = $word.Documents.Open("${filePath.replace(/\\/g, '\\\\')}")
      $text = $doc.Content.Text
      $doc.Close()
      $word.Quit()
      [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
      $text
    `
    const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
    return stdout.trim()
  } catch (error) {
    return `[Word document: ${path.basename(filePath)}. Unable to extract text. Ensure Microsoft Word is installed.]`
  }
}

// Extract text from Excel
async function extractExcelText(filePath: string): Promise<string> {
  try {
    const script = `
      $excel = New-Object -ComObject Excel.Application
      $excel.Visible = $false
      $workbook = $excel.Workbooks.Open("${filePath.replace(/\\/g, '\\\\')}")
      $text = ""
      foreach ($sheet in $workbook.Sheets) {
        $text += "=== Sheet: " + $sheet.Name + " ===" + [Environment]::NewLine
        $usedRange = $sheet.UsedRange
        foreach ($row in $usedRange.Rows) {
          $rowText = @()
          foreach ($cell in $row.Cells) {
            $rowText += $cell.Text
          }
          $text += ($rowText -join " | ") + [Environment]::NewLine
        }
        $text += [Environment]::NewLine
      }
      $workbook.Close()
      $excel.Quit()
      [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
      $text
    `
    const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`, { maxBuffer: 10 * 1024 * 1024 })
    return stdout.trim()
  } catch (error) {
    return `[Excel file: ${path.basename(filePath)}. Unable to extract text. Ensure Microsoft Excel is installed.]`
  }
}

// Extract text from PowerPoint
async function extractPowerPointText(filePath: string): Promise<string> {
  try {
    const script = `
      $ppt = New-Object -ComObject PowerPoint.Application
      $presentation = $ppt.Presentations.Open("${filePath.replace(/\\/g, '\\\\')}", $true, $false, $false)
      $text = ""
      $slideNum = 1
      foreach ($slide in $presentation.Slides) {
        $text += "=== Slide $slideNum ===" + [Environment]::NewLine
        foreach ($shape in $slide.Shapes) {
          if ($shape.HasTextFrame -and $shape.TextFrame.HasText) {
            $text += $shape.TextFrame.TextRange.Text + [Environment]::NewLine
          }
        }
        $text += [Environment]::NewLine
        $slideNum++
      }
      $presentation.Close()
      $ppt.Quit()
      [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
      $text
    `
    const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, '; ')}"`)
    return stdout.trim()
  } catch (error) {
    return `[PowerPoint file: ${path.basename(filePath)}. Unable to extract text. Ensure Microsoft PowerPoint is installed.]`
  }
}

// Main function to extract text based on file type
export async function extractText(filePath: string): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const stats = await fs.stat(filePath)
    if (!stats.isFile()) {
      return { success: false, error: 'Path is not a file' }
    }

    const fileType = getFileType(filePath)
    let text = ''

    switch (fileType) {
      case 'txt':
      case 'md':
      case 'markdown':
      case 'json':
      case 'xml':
      case 'html':
      case 'htm':
      case 'css':
      case 'js':
      case 'ts':
      case 'py':
      case 'java':
      case 'c':
      case 'cpp':
      case 'h':
      case 'csv':
      case 'yaml':
      case 'yml':
      case 'ini':
      case 'log':
        text = await readTextFile(filePath)
        break
      
      case 'pdf':
        text = await extractPdfText(filePath)
        break
      
      case 'doc':
      case 'docx':
        text = await extractWordText(filePath)
        break
      
      case 'xls':
      case 'xlsx':
        text = await extractExcelText(filePath)
        break
      
      case 'ppt':
      case 'pptx':
        text = await extractPowerPointText(filePath)
        break
      
      case 'rtf':
        // RTF can often be read as text with some formatting
        text = await readTextFile(filePath)
        // Strip RTF formatting
        text = text.replace(/\\[a-z]+\d*\s?/g, '').replace(/[{}]/g, '')
        break
      
      default:
        // Try reading as text
        try {
          text = await readTextFile(filePath)
        } catch {
          return { success: false, error: `Unsupported file type: ${fileType}` }
        }
    }

    return { success: true, text }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Extract entities from text
export function extractEntities(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = []
  
  // Email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const emails = text.match(emailRegex) || []
  emails.forEach(email => entities.push({ type: 'email', value: email }))
  
  // Phone numbers
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
  const phones = text.match(phoneRegex) || []
  phones.forEach(phone => entities.push({ type: 'phone', value: phone.trim() }))
  
  // URLs
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g
  const urls = text.match(urlRegex) || []
  urls.forEach(url => entities.push({ type: 'url', value: url }))
  
  // Dates
  const datePatterns = [
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/gi
  ]
  datePatterns.forEach(pattern => {
    const dates = text.match(pattern) || []
    dates.forEach(date => entities.push({ type: 'date', value: date }))
  })
  
  // Money/Currency
  const moneyRegex = /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|thousand|M|B|K))?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|dollars?)/gi
  const money = text.match(moneyRegex) || []
  money.forEach(m => entities.push({ type: 'money', value: m }))
  
  // Percentages
  const percentRegex = /\d+(?:\.\d+)?%/g
  const percents = text.match(percentRegex) || []
  percents.forEach(p => entities.push({ type: 'percentage', value: p }))
  
  return entities
}

// Analyze document structure
export function analyzeStructure(text: string): DocumentSection[] {
  const sections: DocumentSection[] = []
  const lines = text.split('\n')
  
  let currentSection: DocumentSection | null = null
  let currentContent: string[] = []
  
  for (const line of lines) {
    // Detect headers (various patterns)
    const headerPatterns = [
      { regex: /^#{1,6}\s+(.+)$/, levelFn: (m: RegExpMatchArray) => m[0].match(/^#+/)?.[0].length || 1 },
      { regex: /^(\d+\.)+\s+(.+)$/, levelFn: (m: RegExpMatchArray) => m[1].split('.').filter(Boolean).length },
      { regex: /^[A-Z][A-Z\s]{5,}$/, levelFn: () => 1 },
      { regex: /^(?:Section|Chapter|Part|Article)\s+[\dIVX]+[.:]\s*(.+)?$/i, levelFn: () => 1 }
    ]
    
    let isHeader = false
    for (const { regex, levelFn } of headerPatterns) {
      const match = line.match(regex)
      if (match) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim()
          sections.push(currentSection)
        }
        
        currentSection = {
          title: line.trim(),
          content: '',
          level: levelFn(match)
        }
        currentContent = []
        isHeader = true
        break
      }
    }
    
    if (!isHeader && line.trim()) {
      currentContent.push(line)
    }
  }
  
  // Save last section
  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim()
    sections.push(currentSection)
  }
  
  return sections
}

// Analyze RFP/Proposal documents
export function analyzeRFP(text: string): RFPAnalysis {
  const analysis: RFPAnalysis = {
    title: '',
    scope: [],
    requirements: [],
    evaluationCriteria: [],
    deliverables: [],
    keyDates: [],
    mandatoryRequirements: [],
    qualifications: [],
    questions: []
  }
  
  // Extract title (usually at the beginning)
  const titleMatch = text.match(/(?:RFP|Request for Proposal|Request for Quotation|RFQ)[:\s]+(.+?)(?:\n|$)/i)
  if (titleMatch) {
    analysis.title = titleMatch[1].trim()
  } else {
    const firstLine = text.split('\n')[0]
    if (firstLine && firstLine.length < 200) {
      analysis.title = firstLine.trim()
    }
  }
  
  // Extract organization
  const orgPatterns = [
    /(?:issued by|from|organization|agency|department)[:\s]+(.+?)(?:\n|$)/i,
    /(?:on behalf of)[:\s]+(.+?)(?:\n|$)/i
  ]
  for (const pattern of orgPatterns) {
    const match = text.match(pattern)
    if (match) {
      analysis.issuingOrganization = match[1].trim()
      break
    }
  }
  
  // Extract deadline
  const deadlinePatterns = [
    /(?:deadline|due date|submission date|proposals? (?:must be |are |)(?:received|submitted) by)[:\s]+(.+?)(?:\n|$)/i,
    /(?:submit|return).*?(?:by|before|no later than)[:\s]+(.+?)(?:\n|$)/i
  ]
  for (const pattern of deadlinePatterns) {
    const match = text.match(pattern)
    if (match) {
      analysis.submissionDeadline = match[1].trim()
      break
    }
  }
  
  // Extract budget
  const budgetMatch = text.match(/(?:budget|funding|not to exceed|maximum)[:\s]+\$?[\d,]+(?:\.\d{2})?(?:\s*(?:million|M|K))?/i)
  if (budgetMatch) {
    analysis.budget = budgetMatch[0]
  }
  
  // Extract scope items
  const scopeSection = extractSection(text, ['scope of work', 'scope of services', 'project scope', 'scope'])
  if (scopeSection) {
    analysis.scope = extractBulletPoints(scopeSection)
  }
  
  // Extract requirements
  const reqSection = extractSection(text, ['requirements', 'technical requirements', 'functional requirements', 'specifications'])
  if (reqSection) {
    analysis.requirements = extractBulletPoints(reqSection)
  }
  
  // Extract mandatory requirements
  const mandatoryPatterns = [
    /(?:must|shall|required to|mandatory)[:\s]+(.+?)(?:\n|$)/gi,
    /(?:minimum requirements?)[:\s]+(.+?)(?:\n|$)/gi
  ]
  for (const pattern of mandatoryPatterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      analysis.mandatoryRequirements.push(match[1].trim())
    }
  }
  
  // Extract evaluation criteria
  const evalSection = extractSection(text, ['evaluation criteria', 'selection criteria', 'scoring', 'evaluation'])
  if (evalSection) {
    analysis.evaluationCriteria = extractBulletPoints(evalSection)
  }
  
  // Extract deliverables
  const delSection = extractSection(text, ['deliverables', 'expected deliverables', 'outputs'])
  if (delSection) {
    analysis.deliverables = extractBulletPoints(delSection)
  }
  
  // Extract key dates
  const dateEntities = extractEntities(text).filter(e => e.type === 'date')
  const dateContextPatterns = [
    /(.{0,50})((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/gi,
    /(.{0,50})(\d{1,2}\/\d{1,2}\/\d{2,4})/g
  ]
  for (const pattern of dateContextPatterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const context = match[1].trim()
      const date = match[2]
      if (context.length > 3) {
        analysis.keyDates.push({ event: context, date })
      }
    }
  }
  
  // Extract qualifications
  const qualSection = extractSection(text, ['qualifications', 'minimum qualifications', 'vendor qualifications', 'eligibility'])
  if (qualSection) {
    analysis.qualifications = extractBulletPoints(qualSection)
  }
  
  // Extract contact info
  const contactMatch = text.match(/(?:contact|questions|inquiries)[:\s]+(.+?)(?:email|phone|@)/i)
  if (contactMatch) {
    analysis.contactInfo = contactMatch[0]
  }
  
  // Extract questions from document
  const questionMatches = text.match(/[^.!?]*\?/g) || []
  analysis.questions = questionMatches.slice(0, 10).map(q => q.trim())
  
  return analysis
}

// Helper: Extract a section by heading
function extractSection(text: string, headings: string[]): string | null {
  for (const heading of headings) {
    const regex = new RegExp(`(?:^|\\n)(?:#+\\s*)?${heading}[:\\s]*\\n([\\s\\S]*?)(?=\\n(?:#+\\s*)?[A-Z][a-z]+|$)`, 'i')
    const match = text.match(regex)
    if (match) {
      return match[1].trim()
    }
  }
  return null
}

// Helper: Extract bullet points from text
function extractBulletPoints(text: string): string[] {
  const points: string[] = []
  const lines = text.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    // Match various bullet formats
    if (/^[-•*▪▸►]\s+/.test(trimmed)) {
      points.push(trimmed.replace(/^[-•*▪▸►]\s+/, ''))
    } else if (/^\d+[.)]\s+/.test(trimmed)) {
      points.push(trimmed.replace(/^\d+[.)]\s+/, ''))
    } else if (/^[a-z][.)]\s+/i.test(trimmed)) {
      points.push(trimmed.replace(/^[a-z][.)]\s+/i, ''))
    } else if (trimmed.length > 10 && trimmed.length < 500) {
      points.push(trimmed)
    }
  }
  
  return points.filter(p => p.length > 5)
}

// Main analysis function
export async function analyzeDocument(filePath: string, options?: {
  extractRFP?: boolean
  includeEntities?: boolean
  includeStructure?: boolean
}): Promise<AnalysisResult> {
  const stats = await fs.stat(filePath)
  
  const documentInfo: DocumentInfo = {
    path: filePath,
    name: path.basename(filePath),
    type: getFileType(filePath),
    size: stats.size,
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime
  }
  
  const extraction = await extractText(filePath)
  
  if (!extraction.success) {
    return {
      success: false,
      documentInfo,
      error: extraction.error
    }
  }
  
  const content = extraction.text!
  const wordCount = content.split(/\s+/).filter(Boolean).length
  documentInfo.wordCount = wordCount
  
  const result: AnalysisResult = {
    success: true,
    documentInfo,
    content
  }
  
  if (options?.includeEntities !== false) {
    result.entities = extractEntities(content)
  }
  
  if (options?.includeStructure !== false) {
    result.sections = analyzeStructure(content)
  }
  
  if (options?.extractRFP) {
    result.metadata = { rfpAnalysis: analyzeRFP(content) }
  }
  
  // Generate key points (simple extraction)
  const sentences = content.match(/[^.!?]+[.!?]+/g) || []
  result.keyPoints = sentences
    .filter(s => s.length > 30 && s.length < 300)
    .filter(s => /\b(important|key|critical|must|shall|required|significant|major|primary)\b/i.test(s))
    .slice(0, 10)
    .map(s => s.trim())
  
  return result
}

// Compare two documents
export async function compareDocuments(filePath1: string, filePath2: string): Promise<{
  success: boolean
  doc1: DocumentInfo
  doc2: DocumentInfo
  similarities: string[]
  differences: string[]
  error?: string
}> {
  const [result1, result2] = await Promise.all([
    analyzeDocument(filePath1),
    analyzeDocument(filePath2)
  ])
  
  if (!result1.success || !result2.success) {
    return {
      success: false,
      doc1: result1.documentInfo,
      doc2: result2.documentInfo,
      similarities: [],
      differences: [],
      error: result1.error || result2.error
    }
  }
  
  const words1 = new Set(result1.content!.toLowerCase().split(/\s+/))
  const words2 = new Set(result2.content!.toLowerCase().split(/\s+/))
  
  const common = [...words1].filter(w => words2.has(w))
  const onlyIn1 = [...words1].filter(w => !words2.has(w))
  const onlyIn2 = [...words2].filter(w => !words1.has(w))
  
  return {
    success: true,
    doc1: result1.documentInfo,
    doc2: result2.documentInfo,
    similarities: [
      `Common words: ${common.length}`,
      `Similarity ratio: ${Math.round((common.length / Math.max(words1.size, words2.size)) * 100)}%`
    ],
    differences: [
      `Words only in ${result1.documentInfo.name}: ${onlyIn1.length}`,
      `Words only in ${result2.documentInfo.name}: ${onlyIn2.length}`,
      `Size difference: ${Math.abs(result1.documentInfo.size - result2.documentInfo.size)} bytes`
    ]
  }
}
