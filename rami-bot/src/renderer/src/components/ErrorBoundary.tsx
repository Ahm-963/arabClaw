
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
    errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
        this.setState({ error, errorInfo })
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-8 overflow-auto">
                    <div className="max-w-2xl w-full bg-red-900/20 border border-red-500/50 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-red-500/20 rounded-full">
                                <AlertTriangle size={32} className="text-red-500" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-red-400">System Critical Failure</h1>
                                <p className="text-red-300/70">The interface crashed unexpectedly.</p>
                            </div>
                        </div>

                        <div className="bg-black/50 rounded-xl p-4 mb-6 overflow-x-auto border border-white/5">
                            <code className="text-red-300 font-mono text-sm whitespace-pre-wrap">
                                {this.state.error?.toString()}
                            </code>
                        </div>

                        {this.state.errorInfo && (
                            <div className="bg-black/30 rounded-xl p-4 mb-6 overflow-x-auto h-48 border border-white/5">
                                <p className="text-xs text-neutral-500 mb-2 font-bold uppercase">Stack Trace:</p>
                                <code className="text-neutral-400 font-mono text-xs whitespace-pre">
                                    {this.state.errorInfo.componentStack}
                                </code>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all hover:shadow-lg hover:shadow-red-500/20"
                            >
                                <RefreshCcw size={18} />
                                Reboot System
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
