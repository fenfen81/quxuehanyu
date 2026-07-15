import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { sfx } from '@/utils/sfx'
import { chunkSentence, getChunkEns, normalizeText } from '@/utils/chunkSentence'
import type { Sentence } from '@/types'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

interface ChunkedTypePracticeProps {
  sentence: Sentence
  mode: 'type' | 'dictation'
  onAnswer: (userAnswer: string) => boolean
  onPlayAudio: () => void
  lang?: Lang
}

export function ChunkedTypePractice({ sentence, mode, onAnswer, onPlayAudio, lang = 'zh' }: ChunkedTypePracticeProps) {
  const tt = (k: Parameters<typeof t>[0]) => t(k, lang)

  const chunks = useMemo(() => chunkSentence(sentence.cn, sentence.split), [sentence])
  const chunkEns = useMemo(() => getChunkEns(chunks, sentence.dict), [chunks, sentence.dict])
  const isSingleChunk = chunks.length <= 1

  const [phase, setPhase] = useState<'chunk' | 'full'>('chunk')
  const [chunkIdx, setChunkIdx] = useState(0)
  const [chunkInput, setChunkInput] = useState('')
  const [fullInput, setFullInput] = useState('')
  const [showEn, setShowEn] = useState(false)
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none')

  const inputRef = useRef<HTMLInputElement>(null)

  // 短句直接进入整句阶段
  useEffect(() => {
    if (isSingleChunk) setPhase('full')
  }, [isSingleChunk])

  // 切换段落或阶段时自动聚焦
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [chunkIdx, phase])

  const handleChunkCheck = useCallback(() => {
    sfx.play('click')
    const target = chunks[chunkIdx]
    const correct = normalizeText(chunkInput) === normalizeText(target)

    if (correct) {
      sfx.play('correct')
      setFeedback('correct')
      setTimeout(() => {
        setFeedback('none')
        setChunkInput('')
        setShowEn(false)
        if (chunkIdx < chunks.length - 1) {
          setChunkIdx(chunkIdx + 1)
        } else {
          setPhase('full')
        }
      }, 700)
    } else {
      sfx.play('wrong')
      setFeedback('wrong')
    }
  }, [chunkInput, chunks, chunkIdx])

  const handleChunkSkip = useCallback(() => {
    sfx.play('click')
    setFeedback('none')
    setChunkInput('')
    setShowEn(false)
    if (chunkIdx < chunks.length - 1) {
      setChunkIdx(chunkIdx + 1)
    } else {
      setPhase('full')
    }
  }, [chunkIdx, chunks.length])

  const handleFullCheck = useCallback(() => {
    sfx.play('click')
    const cleaned = fullInput.trim().replace(/[。？！，、；：]/g, '')
    onAnswer(cleaned)
  }, [fullInput, onAnswer])

  const handlePlayAudio = useCallback(() => {
    sfx.play('click')
    onPlayAudio()
  }, [onPlayAudio])

  // ── 阶段一：逐段练习 ──
  if (phase === 'chunk') {
    const currentEn = chunkEns[chunkIdx] || ''
    const currentCn = chunks[chunkIdx] || ''
    const isType = mode === 'type'

    return (
      <div className="space-y-5 overflow-hidden">
        {/* 段落进度 */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full">
            {tt('chunk_step')} {chunkIdx + 1}/{chunks.length}
          </span>
          <div className="flex items-center gap-1.5">
            {chunks.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${
                i < chunkIdx ? 'bg-emerald-400' : i === chunkIdx ? 'bg-indigo-500 scale-125' : 'bg-slate-200'
              }`} />
            ))}
          </div>
        </div>

        {/* type 模式：自动显示英文 */}
        {isType && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-200/40">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">English</span>
            </div>
            <p className="text-base leading-relaxed text-slate-800 font-medium break-words">
              {currentEn || tt('chunk_no_translation')}
            </p>
          </div>
        )}

        {/* dictation 模式：播放按钮 + 可选英文 */}
        {!isType && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handlePlayAudio}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500
                           text-white rounded-2xl text-sm font-semibold shadow-sm hover:shadow-md
                           hover:from-teal-600 hover:to-emerald-600 transition-all active:scale-[0.97]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.08"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {tt('dict_play')}
              </button>
              <button
                onClick={() => { sfx.play('click'); setShowEn(!showEn) }}
                className={`inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all
                  ${showEn ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}
              >
                {showEn ? tt('chunk_hide_en') : tt('chunk_show_en')}
              </button>
            </div>
            {showEn && (
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/40 text-center">
                <p className="text-sm text-slate-700 font-medium">{currentEn || tt('chunk_no_translation')}</p>
              </div>
            )}
          </div>
        )}

        {/* 输入框 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 min-h-[20px]">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{tt('type_input_label')}</span>
            {feedback === 'wrong' && (
              <span className="text-xs font-bold text-red-500">
                {tt('chunk_correct_answer')}: {currentCn.replace(/\s/g, '')}
              </span>
            )}
            {feedback === 'correct' && (
              <span className="text-xs font-bold text-emerald-500">✓</span>
            )}
          </div>
          <Input
            ref={inputRef}
            value={chunkInput}
            onChange={(e) => {
              setChunkInput(e.target.value)
              if (feedback !== 'none') setFeedback('none')
              sfx.play('keyboard')
            }}
            placeholder={tt('type_placeholder')}
            className={`text-lg h-14 text-center rounded-xl border-2 transition-all
              ${feedback === 'correct'
                ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100'
                : feedback === 'wrong'
                ? 'border-red-400 bg-red-50 ring-2 ring-red-100'
                : isType
                ? 'border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                : 'border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100'
              }
              placeholder:text-slate-300`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { handleChunkCheck() }
              else if (e.key === 'Backspace') { sfx.play('delete') }
            }}
          />
        </div>

        {/* 按钮 */}
        <div className="flex justify-center gap-3">
          <button
            onClick={handleChunkCheck}
            disabled={!chunkInput.trim()}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white
                       rounded-xl font-semibold text-sm shadow-sm hover:shadow-md
                       hover:from-blue-600 hover:to-indigo-600 transition-all
                       disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97]"
          >
            ✓ {tt('type_check')}
          </button>
          <button
            onClick={handleChunkSkip}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl
                       font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            {tt('skip')} →
          </button>
        </div>

        {/* 已完成段落预览 */}
        {chunkIdx > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-1.5">{tt('chunk_completed')}</p>
            <div className="flex flex-wrap gap-2">
              {chunks.slice(0, chunkIdx).map((c, i) => (
                <span key={i} className="text-sm text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
                  {c.replace(/\s/g, '')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── 阶段二：整句输入 ──
  const isType = mode === 'type'

  return (
    <div className="space-y-5 overflow-hidden">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full">
          {tt('chunk_final')}
        </span>
      </div>

      {/* type 模式：显示完整英文 */}
      {isType && (
        <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-200/40">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">English</span>
          </div>
          <p className="text-[17px] leading-relaxed text-slate-800 font-medium break-words">{sentence.en}</p>
        </div>
      )}

      {/* dictation 模式：播放按钮 */}
      {!isType && (
        <div className="text-center">
          <button
            onClick={handlePlayAudio}
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
        </div>
      )}

      {/* 分段提示 */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
        <p className="text-xs text-slate-400 mb-1.5">{tt('chunk_hint')}</p>
        <div className="flex flex-wrap gap-2">
          {chunks.map((c, i) => (
            <span key={i} className="text-sm text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              {c.replace(/\s/g, '')}
            </span>
          ))}
        </div>
      </div>

      {/* 输入框 */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{tt('chunk_full_input')}</span>
        </div>
        <Input
          ref={inputRef}
          value={fullInput}
          onChange={(e) => { setFullInput(e.target.value); sfx.play('keyboard') }}
          placeholder={tt('type_placeholder')}
          className="text-lg h-14 text-center rounded-xl border-2 border-slate-200
                     focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all
                     placeholder:text-slate-300"
          onKeyDown={(e) => {
            if (e.key === 'Enter') { handleFullCheck() }
            else if (e.key === 'Backspace') { sfx.play('delete') }
          }}
        />
      </div>

      {/* 按钮 */}
      <div className="flex justify-center gap-3">
        <button
          onClick={handleFullCheck}
          disabled={!fullInput.trim()}
          className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white
                     rounded-xl font-semibold text-sm shadow-sm hover:shadow-md
                     hover:from-blue-600 hover:to-indigo-600 transition-all
                     disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97]"
        >
          ✓ {tt('type_check')}
        </button>
        <button
          onClick={() => { sfx.play('delete'); setFullInput('') }}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl
                     font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          ↻ {tt('reset')}
        </button>
      </div>
    </div>
  )
}
