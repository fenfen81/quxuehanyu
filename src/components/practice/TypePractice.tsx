import { useState, useCallback, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { sfx } from '@/utils/sfx'
import type { Sentence } from '@/types'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

interface TypePracticeProps {
  sentence: Sentence
  onAnswer: (userAnswer: string) => boolean
  lang?: Lang
}

export function TypePractice({ sentence, onAnswer, lang = 'zh' }: TypePracticeProps) {
  const tt = (k: Parameters<typeof t>[0]) => t(k, lang)
  const [value, setValue] = useState('')

  // 切到下一句（组件重新挂载）时自动聚焦输入框，回车提交后无需鼠标点击
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleCheck = useCallback(() => {
    sfx.play('click')
    const reg = /[。？！，、；：]/g
    const cleaned = value.trim().replace(reg, '')
    onAnswer(cleaned)
  }, [value, onAnswer])

  return (
    <div className="space-y-5 overflow-hidden">
      <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-200/40">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">English</span>
        </div>
        <p className="text-[17px] leading-relaxed text-slate-800 font-medium break-words">{sentence.en}</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{tt('type_input_label')}</span>
        </div>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); sfx.play('keyboard') }}
          placeholder={tt('type_placeholder')}
          className="text-lg h-14 text-center rounded-xl border-2 border-slate-200
                     focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all
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
          ✓ {tt('type_check')}
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
