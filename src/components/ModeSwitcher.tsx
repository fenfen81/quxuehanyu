import { usePracticeStore } from '@/hooks/usePracticeStore'
import type { PracticeMode } from '@/types'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

interface ModeSwitcherProps {
  lang?: Lang
}

export function ModeSwitcher({ lang = 'zh' }: ModeSwitcherProps) {
  const { mode, setMode } = usePracticeStore()

  const modes: { value: PracticeMode; icon: string; label: string }[] = [
    { value: 'drag', icon: '🧩', label: t('mode_drag', lang) },
    { value: 'type', icon: '⌨️', label: t('mode_type', lang) },
    { value: 'dictation', icon: '🎧', label: t('mode_dictation', lang) },
  ]

  return (
    <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => setMode(m.value)}
          className={`mode-tab flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all
            ${mode === m.value
              ? 'bg-white text-blue-600 shadow-sm active'
              : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <span className="text-base">{m.icon}</span>
          <span className="hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  )
}
