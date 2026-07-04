import { useState, useCallback, useEffect } from 'react'
import type { Lang } from '@/i18n/translations'

const LANG_KEY = 'quxue-lang'

let globalLang: Lang = (() => {
  try { return (localStorage.getItem(LANG_KEY) as Lang) || 'zh' } catch { return 'zh' }
})()

const listeners = new Set<(lang: Lang) => void>()

export function useLang() {
  const [lang, setLangState] = useState<Lang>(globalLang)

  const setLang = useCallback((l: Lang) => {
    globalLang = l
    try { localStorage.setItem(LANG_KEY, l) } catch {}
    listeners.forEach(fn => fn(l))
    setLangState(l)
  }, [])

  const toggle = useCallback(() => {
    setLang(globalLang === 'zh' ? 'en' : 'zh')
  }, [setLang])

  useEffect(() => {
    const fn = (l: Lang) => setLangState(l)
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])

  return { lang, setLang, toggle }
}
