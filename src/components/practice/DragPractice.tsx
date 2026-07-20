import { useState, useCallback, useMemo, useRef } from 'react'
import { sfx } from '@/utils/sfx'
import type { Sentence } from '@/types'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'
import { chunkSentence } from '@/utils/chunkSentence'

interface DragPracticeProps {
  sentence: Sentence
  onWordClick: (word: string) => void
  onAnswer: (userAnswer: string) => boolean
  lang?: Lang
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const r = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[r]] = [a[r], a[i]]
  }
  return a
}

function readDragData(e: React.DragEvent): { word: string; from: 'source' | 'target'; idx: number } | null {
  const raw = e.dataTransfer.getData('application/json')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

const isTouchDevice = (() => {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
})()

export function DragPractice({ sentence, onWordClick, onAnswer, lang = 'zh' }: DragPracticeProps) {
  const tt = (k: Parameters<typeof t>[0]) => t(k, lang)
  // 仅 HSK5（上）使用新意群分段；其余教材（汉语教程、HSK1-4）按原始 sentence.split 逐词分词
  const isHsk5 = sentence.id.startsWith('hsk5-')
  const words = useMemo(() => {
    return isHsk5
      ? chunkSentence(sentence.cn, sentence.split)
      : sentence.split.split(/\s+/).filter(Boolean)
  }, [sentence.cn, sentence.split, isHsk5])

  const [sourceItems, setSourceItems] = useState<string[]>(() => shuffle([...words]))
  const [targetItems, setTargetItems] = useState<string[]>([])
  const dragInfo = useRef<{ word: string; from: 'source' | 'target'; idx: number } | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, word: string, from: 'source' | 'target', idx: number) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ word, from, idx }))
    e.dataTransfer.effectAllowed = 'move'
    dragInfo.current = { word, from, idx }
  }, [])

  const handleDropOnTarget = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const data = readDragData(e)
    if (!data) return
    sfx.play('click')
    if (data.from === 'source') {
      setSourceItems(prev => prev.filter((_, i) => i !== data!.idx))
      setTargetItems(prev => [...prev, data!.word])
    } else {
      setTargetItems(prev => {
        const without = prev.filter((_, i) => i !== data!.idx)
        return [...without, data!.word]
      })
    }
  }, [])

  const handleDropOnSource = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const data = readDragData(e)
    if (!data || data.from !== 'target') return
    sfx.play('click')
    setTargetItems(prev => prev.filter((_, i) => i !== data.idx))
    setSourceItems(prev => [...prev, data.word])
  }, [])

  const handleSourceWordTap = useCallback((word: string, idx: number) => {
    sfx.play('click')
    setSourceItems(prev => prev.filter((_, i) => i !== idx))
    setTargetItems(prev => [...prev, word])
  }, [])

  const handleTargetWordTap = useCallback((word: string, idx: number, e: React.MouseEvent) => {
    if (isTouchDevice) {
      e.stopPropagation()
      sfx.play('delete')
      setTargetItems(prev => prev.filter((_, i) => i !== idx))
      setSourceItems(prev => [...prev, word])
    } else {
      onWordClick(word)
    }
  }, [onWordClick])

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleTargetWordTouchStart = useCallback((word: string) => {
    if (!isTouchDevice) return
    longPressTimer.current = setTimeout(() => {
      onWordClick(word)
      longPressTimer.current = null
    }, 500)
  }, [onWordClick])

  const handleTargetWordTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleCheck = useCallback(() => {
    sfx.play('click')
    // chunks 可能含内部空格，标准化为无空格字符串再与 cn 比对
    onAnswer(targetItems.join('').replace(/\s/g, ''))
  }, [targetItems, onAnswer])

  const handleReset = useCallback(() => {
    sfx.play('delete')
    setTargetItems([])
    setSourceItems(shuffle([...words]))
  }, [words])

  return (
    <div className="space-y-4 overflow-hidden">
      {/* 词语区 */}
      <div className="rounded-xl bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-200/50 p-4 min-h-[72px]"
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
        onDrop={handleDropOnSource}
      >
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">{tt('drag_words')}</span>
          <span className="text-[10px] text-blue-300">
            {isTouchDevice ? `· ${tt('drag_words_hint')}` : `· ${tt('drag_words_hint_drag')}`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sourceItems.map((word, idx) => (
            <span
              key={`s-${idx}-${word}`}
              draggable={!isTouchDevice}
              onDragStart={e => handleDragStart(e, word, 'source', idx)}
              onClick={() => handleSourceWordTap(word, idx)}
              className="word-chip inline-flex items-center px-4 py-2.5 bg-white border border-blue-200/60 rounded-xl
                         text-[17px] sm:text-[18px] font-medium text-blue-800 cursor-grab
                         shadow-sm hover:shadow-md active:cursor-grabbing
                         active:scale-95 transition-transform select-none"
            >
              {word}
            </span>
          ))}
        </div>
        {sourceItems.length === 0 && (
          <p className="text-xs text-blue-400 text-center py-1">{tt('drag_all_used')} ✨</p>
        )}
      </div>

      {/* 答案区 */}
      <div
        className={`rounded-xl border-2 border-dashed p-4 min-h-[80px] transition-all duration-200 ${
          targetItems.length > 0
            ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/60 to-teal-50/30'
            : 'border-slate-200 bg-slate-50/50'
        }`}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
        onDrop={handleDropOnTarget}
      >
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-xs font-bold text-emerald-500 uppercase tracking-wide">{tt('drag_answer')}</span>
          <span className="text-[10px] text-emerald-300">
            {isTouchDevice ? `· ${tt('drag_answer_hint')}` : `· ${tt('drag_answer_hint_empty')}`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {targetItems.map((word, idx) => (
            <span
              key={`t-${idx}-${word}`}
              draggable={!isTouchDevice}
              onDragStart={e => handleDragStart(e, word, 'target', idx)}
              onClick={(e) => handleTargetWordTap(word, idx, e)}
              onTouchStart={() => handleTargetWordTouchStart(word)}
              onTouchEnd={handleTargetWordTouchEnd}
              onTouchMove={handleTargetWordTouchEnd}
              className="word-chip inline-flex items-center px-4 py-2.5 bg-white border border-emerald-300/60 rounded-xl
                         text-[17px] sm:text-[18px] font-medium text-emerald-800 cursor-grab
                         shadow-sm hover:shadow-md hover:bg-emerald-50 active:cursor-grabbing
                         active:scale-95 transition-transform select-none"
            >
              {word}
              <svg className="ml-1 text-emerald-400 opacity-50" width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          ))}
        </div>
        {targetItems.length === 0 && (
          <div className="text-center py-2">
            <p className="text-xs text-slate-400">
              {isTouchDevice ? `👆 ${tt('drag_placeholder')}` : `👆 ${tt('drag_placeholder_drag')}`}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-3 pt-1">
        <button
          onClick={handleCheck}
          disabled={targetItems.length === 0}
          className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white
                     rounded-xl font-semibold text-sm shadow-sm hover:shadow-md
                     hover:from-blue-600 hover:to-indigo-600 transition-all
                     disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97]"
        >
          ✓ {tt('drag_check')}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl
                     font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          ↻ {tt('reset')}
        </button>
      </div>
    </div>
  )
}
