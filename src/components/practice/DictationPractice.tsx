import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { sfx } from '@/utils/sfx'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

interface DictationPracticeProps {
  onAnswer: (userAnswer: string) => boolean
  onPlayAudio: () => void
  lang?: Lang
}

export function DictationPractice({ onAnswer, onPlayAudio, lang = 'zh' }: DictationPracticeProps) {
  const tt = (k: Parameters<typeof t>[0]) => t(k, lang)
  const [value, setValue] = useState('')
  const [playCount, setPlayCount] = useState(0)

  const handlePlay = useCallback(() => {
    sfx.play('click')
    onPlayAudio()
    setPlayCount(c => c + 1)
  }, [onPlayAudio])

  const handleCheck = useCallback(() => {
    sfx.play('click')
    const reg = /[。？！，、；：]/g
    const cleaned = value.trim().replace(reg, '')
    onAnswer(cleaned)
  }, [value, onAnswer])

  return (
    <div className="space-y-5 overflow-hidden">
      <div className="text-center">
        <button
          onClick={handlePlay}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500
                     text-white rounded-2xl text-base font-semibold shadow-md hover:shadow-lg
                     hover:from-teal-600 hover:to-emerald-600 transition-all active:scale-[0.97]
                     animate-pulse-glow"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.08"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {tt('dict_play')}
        </button>
        {playCount > 0 && (
          <p className="text-xs text-slate-400 mt-2">{tt('dict_played')} {playCount} {tt('dict_times')}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{tt('dict_label')}</span>
        </div>
        <Input
          value={value}
          onChange={(e) => { setValue(e.target.value); sfx.play('keyboard') }}
          placeholder={tt('dict_placeholder')}
          className="text-lg h-14 text-center rounded-xl border-2 border-slate-200
                     focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all
                     placeholder:text-slate-300"
          onKeyDown={(e) => {
            if (e.key === 'Enter') { handleCheck() }
            else if (e.key === 'Backspace') { sfx.play('delete') }
          }}
        />
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={handleCheck}
          disabled={!value.trim()}
          className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white
                     rounded-xl font-semibold text-sm shadow-sm hover:shadow-md
                     hover:from-blue-600 hover:to-indigo-600 transition-all
                     disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97]"
        >
          ✓ {tt('dict_check')}
        </button>
        <button
          onClick={() => { sfx.play('delete'); setValue('') }}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl
                     font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          ↻ {tt('reset')}
        </button>
      </div>
    </div>
  )
}
