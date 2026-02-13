import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Smartphone, Wifi, Power, RefreshCw, X } from 'lucide-react'
import QRCode from 'qrcode'

interface RemoteControlPanelProps {
    isOpen: boolean
    onClose: () => void
}

function RemoteControlPanel({ isOpen, onClose }: RemoteControlPanelProps) {
    const { t } = useTranslation()
    const [isRunning, setIsRunning] = useState(false)
    const [url, setUrl] = useState('')
    const [qrCodeData, setQrCodeData] = useState('')
    const [port, setPort] = useState(3000)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && url) {
            generateQR(url)
        }
    }, [isOpen, url])

    const generateQR = async (text: string) => {
        try {
            const data = await QRCode.toDataURL(text, { margin: 1, width: 200 })
            setQrCodeData(data)
        } catch (err) {
            console.error(err)
        }
    }

    const toggleServer = async () => {
        setIsLoading(true)
        setError(null)

        try {
            if (isRunning) {
                await window.electron?.invoke('remote:stop')
                setIsRunning(false)
                setUrl('')
                setQrCodeData('')
            } else {
                const result = await window.electron?.invoke('remote:start', port)
                if (result.success) {
                    setIsRunning(true)
                    setUrl(result.url)
                    generateQR(result.url)
                } else {
                    setError(result.error || 'Failed to start server')
                }
            }
        } catch (e: any) {
            setError(e.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-800 rounded-2xl w-[500px] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-dark-700">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isRunning ? 'bg-blue-600' : 'bg-dark-600'}`}>
                            <Smartphone size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{t('remote.title', 'Remote Control')}</h2>
                            <p className="text-sm text-dark-400">{t('remote.subtitle', 'Control from your phone')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col items-center gap-6">

                    {/* Status & Control */}
                    <div className="flex flex-col items-center gap-4 w-full">
                        <div className="flex items-center gap-4 w-full justify-between bg-dark-750 p-4 rounded-xl border border-dark-700">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                <span className="font-medium text-dark-200">
                                    {isRunning ? 'Server Running' : 'Server Stopped'}
                                </span>
                            </div>

                            <button
                                onClick={toggleServer}
                                disabled={isLoading}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isRunning
                                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                        : 'bg-blue-600 text-white hover:bg-blue-500'
                                    }`}
                            >
                                {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Power size={18} />}
                                {isRunning ? 'Stop Server' : 'Start Server'}
                            </button>
                        </div>

                        {!isRunning && (
                            <div className="flex items-center gap-3 w-full justify-between px-2">
                                <label className="text-dark-400">Port:</label>
                                <input
                                    type="number"
                                    value={port}
                                    onChange={(e) => setPort(parseInt(e.target.value))}
                                    className="bg-dark-700 border border-dark-600 rounded px-3 py-1 w-24 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        )}
                    </div>

                    {/* QR Code Area */}
                    {isRunning && (
                        <div className="flex flex-col items-center gap-4 animate-fadeIn">
                            <div className="bg-white p-4 rounded-xl shadow-lg">
                                {qrCodeData ? (
                                    <img src={qrCodeData} alt="Connection QR Code" className="w-48 h-48" />
                                ) : (
                                    <div className="w-48 h-48 flex items-center justify-center text-black/50">
                                        Generating QR...
                                    </div>
                                )}
                            </div>

                            <div className="text-center">
                                <p className="text-dark-400 text-sm mb-1">Scan to connect</p>
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-mono text-lg hover:underline">
                                    {url}
                                </a>
                            </div>

                            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 w-full text-center">
                                <p className="text-xs text-blue-300">
                                    Ensure your phone is on the same Wi-Fi network as this computer.
                                </p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="text-red-400 text-sm text-center bg-red-900/20 p-3 rounded-lg w-full">
                            Error: {error}
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}

export default RemoteControlPanel
