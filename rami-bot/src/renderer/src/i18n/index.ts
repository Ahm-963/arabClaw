import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import ar from './locales/ar.json'
import he from './locales/he.json'

const resources = {
  en: { translation: en },
  ar: { translation: ar },
  he: { translation: he }
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  })

// Update document direction based on language
i18n.on('languageChanged', (lng) => {
  const dir = ['ar', 'he'].includes(lng) ? 'rtl' : 'ltr'
  document.documentElement.dir = dir
  document.documentElement.lang = lng
})

export default i18n
