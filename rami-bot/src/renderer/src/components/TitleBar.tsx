import React from 'react'
import { useTranslation } from 'react-i18next'
import logo from '../assets/logo.png'

function TitleBar() {
  const { t } = useTranslation()

  return (
    <div className="h-12 bg-dark-950 flex items-center px-4 border-b border-dark-700">
      <div className="flex items-center gap-2">
        <img src={logo} alt="ArabClaw Logo" className="w-8 h-8 rounded-lg shadow-lg shadow-primary-900/20" />
        <span className="text-lg font-bold text-white tracking-tight">
          Arab<span className="text-primary-500">Claw</span>
        </span>
      </div>
    </div>
  )
}

export default TitleBar
