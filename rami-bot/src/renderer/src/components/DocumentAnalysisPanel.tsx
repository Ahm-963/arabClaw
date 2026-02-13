import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Upload, X, Play, Loader, File, CheckCircle, AlertCircle } from 'lucide-react'

interface DocumentAnalysisPanelProps {
    isOpen: boolean
    onClose: () => void
}

function DocumentAnalysisPanel({ isOpen, onClose }: DocumentAnalysisPanelProps) {
    const { t } = useTranslation()
    const [file, setFile] = useState<File | null>(null)
    const [analyzing, setAnalyzing] = useState(false)
    const [result, setResult] = useState<string>('')
    const [analysisType, setAnalysisType] = useState<'summary' | 'action_items' | 'sentiment' | 'full'>('summary')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setResult('')
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0])
            setResult('')
        }
    }

    const analyzeDocument = async () => {
        if (!file) return

        setAnalyzing(true)
        setResult('')

        try {
            // Use backend analysis which supports PDF and text files
            // We successfully added analyzeDocument to preload
            // If we run into TS issues, we can cast window.electron
            const response = await (window.electron as any).analyzeDocument(file.path, `Analysis Type: ${analysisType}`)
            setResult(response || 'No analysis generated.')
        } catch (error: any) {
            setResult(`Error analyzing document: ${error.message}`)
        } finally {
            setAnalyzing(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-800 rounded-2xl w-[800px] max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-dark-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Document Analysis</h2>
                            <p className="text-sm text-dark-400">Analyze text files, code, and logs</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!file ? (
                        <div
                            className="border-2 border-dashed border-dark-600 rounded-2xl p-12 text-center hover:border-primary-500 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                        >
                            <Upload size={48} className="mx-auto text-dark-400 mb-4" />
                            <h3 className="text-lg font-semibold text-dark-200 mb-2">Upload a Document</h3>
                            <p className="text-dark-400 mb-6">Drag & drop or click to browse</p>
                            <button className="px-6 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg">
                                Choose File
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".txt,.md,.json,.js,.ts,.py,.log,.csv"
                                onChange={handleFileChange}
                            />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* File Info */}
                            <div className="bg-dark-750 p-4 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <File size={24} className="text-primary-400" />
                                    <div>
                                        <div className="font-medium">{file.name}</div>
                                        <div className="text-xs text-dark-400">{(file.size / 1024).toFixed(1)} KB</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setFile(null); setResult('') }}
                                    className="text-red-400 hover:text-red-300 p-2"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Controls */}
                            <div className="flex gap-4">
                                <select
                                    value={analysisType}
                                    onChange={(e) => setAnalysisType(e.target.value as any)}
                                    className="bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="summary">Summarize</option>
                                    <option value="action_items">Extract Action Items</option>
                                    <option value="sentiment">Sentiment Analysis</option>
                                    <option value="full">Deep Analysis</option>
                                </select>

                                <button
                                    onClick={analyzeDocument}
                                    disabled={analyzing}
                                    className="flex-1 bg-primary-600 hover:bg-primary-500 disabled:bg-dark-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                                >
                                    {analyzing ? (
                                        <>
                                            <Loader size={18} className="animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <Play size={18} />
                                            Start Analysis
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Result */}
                            {result && (
                                <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
                                    <h3 className="font-bold mb-4 flex items-center gap-2">
                                        <CheckCircle size={18} className="text-green-500" />
                                        Analysis Result
                                    </h3>
                                    <div className="prose prose-invert max-w-none whitespace-pre-wrap text-dark-200">
                                        {result}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default DocumentAnalysisPanel
