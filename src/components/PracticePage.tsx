import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { getTextbookById } from '@/data/content'
import { textbookVocabList } from '@/data/textbookDict'
import { usePracticeStore } from '@/hooks/usePracticeStore'
import { useTTS } from '@/hooks/useTTS'
import { ModeSwitcher } from '@/components/ModeSwitcher'
import { LessonSelector } from '@/components/LessonSelector'
import { DragPractice } from '@/components/practice/DragPractice'
import { TypePractice } from '@/components/practice/TypePractice'
import { DictationPractice } from '@/components/practice/DictationPractice'
import { ChunkedTypePractice } from '@/components/practice/ChunkedTypePractice'
import { WordPopup } from '@/components/practice/WordPopup'
import { sfx } from '@/utils/sfx'
import type { Sentence } from '@/types'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

// ── 错题本 localStorage 工具 ──
const WRONG_KEY = 'qx_wrong_sentences'
const PASS_KEY  = 'qx_pass_count'

function loadWrongSentences(): Sentence[] {
  try { return JSON.parse(localStorage.getItem(WRONG_KEY) || '[]') } catch { return [] }
}
function saveWrong(s: Sentence) {
  const list = loadWrongSentences()
  if (!list.find(x => x.cn === s.cn)) {
    list.push(s)
    localStorage.setItem(WRONG_KEY, JSON.stringify(list))
  }
}
function removeWrong(cn: string) {
  const list = loadWrongSentences().filter(x => x.cn !== cn)
  localStorage.setItem(WRONG_KEY, JSON.stringify(list))
}
function loadPassCount(): number {
  return parseInt(localStorage.getItem(PASS_KEY) || '0', 10)
}
function incPassCount(): number {
  const n = loadPassCount() + 1
  localStorage.setItem(PASS_KEY, String(n))
  return n
}

interface PracticePageProps {
  onCorrect: () => void
  onWrong: () => void
  onGoToWords?: () => void
  lang?: Lang
}

export function PracticePage({ onCorrect, onWrong, onGoToWords, lang = 'zh' }: PracticePageProps) {
  const { mode, currentTextbookId, currentLessonId, currentTextId, currentIndex, setCurrentIndex } =
    usePracticeStore()
  const { speak, speakChunk } = useTTS()
  const tt = (k: Parameters<typeof t>[0]) => t(k, lang)

  const [tipText, setTipText] = useState('')
  const [tipColor, setTipColor] = useState<'green' | 'red'>('green')
  const [showXpFloat, setShowXpFloat] = useState(false)
  const [showCoin, setShowCoin] = useState(false)
  const [passCount, setPassCount] = useState(loadPassCount)
  const [wrongList, setWrongList] = useState<Sentence[]>(loadWrongSentences)
  const [wrongMode, setWrongMode] = useState(false)
  const [wrongIdx, setWrongIdx] = useState(0)

  const [popupWord, setPopupWord] = useState<string | null>(null)
  const [popupPinyin, setPopupPinyin] = useState('')
  const [popupMeaning, setPopupMeaning] = useState('')
  const [popupOpen, setPopupOpen] = useState(false)
  const [chunked, setChunked] = useState(false)

  const refreshWrongList = useCallback(() => {
    setWrongList(loadWrongSentences())
  }, [])

  const sentence: Sentence | null = useMemo(() => {
    if (!currentTextbookId || !currentLessonId || !currentTextId) return null
    const book = getTextbookById(currentTextbookId)
    const lesson = book?.lessons.find((l) => l.id === currentLessonId)
    const text = lesson?.texts.find((t) => t.id === currentTextId)
    return text?.sentences[currentIndex] ?? null
  }, [currentTextbookId, currentLessonId, currentTextId, currentIndex])

  const activeSentence: Sentence | null = wrongMode ? (wrongList[wrongIdx] ?? null) : sentence

  const totalSentences = useMemo(() => {
    if (!currentTextbookId || !currentLessonId || !currentTextId) return 0
    const book = getTextbookById(currentTextbookId)
    const lesson = book?.lessons.find((l) => l.id === currentLessonId)
    const text = lesson?.texts.find((t) => t.id === currentTextId)
    return text?.sentences.length ?? 0
  }, [currentTextbookId, currentLessonId, currentTextId])

  const bookInfo = useMemo(() => {
    if (!currentTextbookId) return null
    return getTextbookById(currentTextbookId)
  }, [currentTextbookId])

  // 检查当前教材课文是否在 textbookDict 中有生词数据
  const hasTextbookVocab = useMemo(() => {
    if (!currentTextbookId || !currentLessonId) return false
    const tb = textbookVocabList.find(t => t.textbookId === currentTextbookId)
    if (!tb) return false
    return tb.lessons.some(l => l.lessonId === currentLessonId)
  }, [currentTextbookId, currentLessonId])

  const handleGoToWords = useCallback(() => {
    if (!currentTextbookId || !currentLessonId) return
    try {
      localStorage.setItem('qx_tb_vocab_jump', JSON.stringify({ textbookId: currentTextbookId, lessonId: currentLessonId, ts: Date.now() }))
    } catch {}
    onGoToWords?.()
  }, [currentTextbookId, currentLessonId, onGoToWords])

  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleAnswer = useCallback(
    (userAnswer: string) => {
      const cur = wrongMode ? wrongList[wrongIdx] : sentence
      if (!cur) return false
      const reg = /[。？！，、；：]/g
      const std = cur.cn.replace(reg, '')
      const user = userAnswer.replace(reg, '')
      const correct = user === std
      if (correct) {
        const newPass = incPassCount()
        setPassCount(newPass)
        setTipText(`🎉 ${tt('practice_correct')} +10 XP · ${tt('practice_pass_count')} ${newPass} ${tt('practice_times')}`)
        setTipColor('green')
        onCorrect()
        setShowXpFloat(true)
        setShowCoin(true)
        setTimeout(() => { setShowXpFloat(false); setShowCoin(false) }, 1800)
        sfx.play('correct')
        if (wrongMode) {
          removeWrong(cur.cn)
          refreshWrongList()
        }
        if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
        autoAdvanceTimer.current = setTimeout(() => {
          if (wrongMode) {
            const nextList = loadWrongSentences()
            if (nextList.length === 0) {
              setWrongMode(false)
              setWrongList([])
              setTipText(`🏆 ${tt('practice_wrong_cleared')}`)
            } else {
              setWrongList(nextList)
              setWrongIdx(i => Math.min(i, nextList.length - 1))
              setTipText('')
            }
          } else {
            if (currentIndex < totalSentences - 1) {
              setCurrentIndex(currentIndex + 1)
              setTipText('')
            } else {
              sfx.play('complete')
              setTipText(`🏆 ${tt('practice_all_done')}`)
            }
          }
        }, 1800)
      } else {
        setTipText(`❌ ${tt('practice_wrong_answer')}：${std}`)
        setTipColor('red')
        onWrong()
        sfx.play('wrong')
        if (!wrongMode && cur) {
          saveWrong(cur)
          refreshWrongList()
        }
      }
      return correct
    },
    [sentence, wrongMode, wrongList, wrongIdx, onCorrect, onWrong, currentIndex, totalSentences, setCurrentIndex, refreshWrongList, lang],
  )

  const goToIndex = useCallback((newIdx: number) => {
    if (autoAdvanceTimer.current) { clearTimeout(autoAdvanceTimer.current); autoAdvanceTimer.current = null }
    setCurrentIndex(newIdx)
    setTipText('')
  }, [setCurrentIndex])

  const handleWordClick = useCallback(
    (word: string) => {
      const cur = wrongMode ? wrongList[wrongIdx] : sentence
      if (!cur) return
      const entry = cur.dict[word]
      let py = ''
      let mean = ''
      if (entry) {
        const parts = entry.split(' / ')
        py = parts[0] || ''
        mean = parts[1] || ''
      }
      setPopupWord(word)
      setPopupPinyin(py)
      setPopupMeaning(mean)
      setPopupOpen(true)
    },
    [sentence, wrongMode, wrongList, wrongIdx],
  )

  const handlePlayAudio = useCallback(async () => {
    const cur = wrongMode ? wrongList[wrongIdx] : sentence
    if (!cur) return
    const result = await speak(cur.id, cur.cn)
    if (result === 'loading') {
      setTipText(`🔊 ${tt('practice_loading_audio')}`)
      setTipColor('green')
    }
  }, [sentence, wrongMode, wrongList, wrongIdx, speak, lang])

  // 分段练习：播放某一段的对应音频
  const handlePlayChunkAudio = useCallback((chunkIdx: number, text: string) => {
    const cur = wrongMode ? wrongList[wrongIdx] : sentence
    if (!cur) return
    speakChunk(cur.id, chunkIdx, text)
  }, [wrongMode, wrongList, wrongIdx, sentence, speakChunk])

  // 听写模式（整句）：进入下一句（含初次进入）时自动播放整句音频
  useEffect(() => {
    if (mode !== 'dictation' || chunked || wrongMode) return
    if (!activeSentence) return
    speak(activeSentence.id, activeSentence.cn)
  }, [activeSentence?.id, mode, chunked, wrongMode, speak])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) { sfx.play('click'); goToIndex(currentIndex - 1) }
  }, [currentIndex, goToIndex])
  const handleNext = useCallback(() => {
    if (currentIndex < totalSentences - 1) { sfx.play('click'); goToIndex(currentIndex + 1) }
  }, [currentIndex, totalSentences, goToIndex])

  const progressPercent = wrongMode
    ? wrongList.length > 0 ? ((wrongIdx + 1) / wrongList.length) * 100 : 0
    : totalSentences > 0 ? ((currentIndex + 1) / totalSentences) * 100 : 0

  if (!activeSentence && !wrongMode) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1"><LessonSelector lang={lang} /></div>
            <ModeSwitcher lang={lang} />
          </div>
        </div>

        {wrongList.length > 0 && (
          <button
            onClick={() => { setWrongMode(true); setWrongIdx(0); setTipText('') }}
            className="w-full flex items-center justify-between px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl hover:bg-amber-100 transition-all"
          >
            <span className="font-bold text-amber-700">📋 {tt('practice_wrong_list')}</span>
            <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">{wrongList.length}</span>
          </button>
        )}

        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="text-5xl mb-4 animate-float">📖</div>
          <p className="text-lg font-bold text-slate-600 mb-2">{tt('practice_select_lesson')}</p>
          <p className="text-sm text-slate-400">{tt('practice_select_hint')}</p>
        </div>

        <WordPopup word={popupWord} pinyin={popupPinyin} meaning={popupMeaning}
          open={popupOpen} onOpenChange={setPopupOpen} lang={lang} />
      </div>
    )
  }

  const bookTitle = bookInfo ? (lang === 'en' && bookInfo.titleEn ? bookInfo.titleEn : bookInfo.title) : ''

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* ====== 顶部：教材信息 + 选择器 ====== */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 sm:p-5 animate-slide-down">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">{wrongMode ? '📋' : '📖'}</span>
          </div>
          <h2 className="text-sm font-bold text-slate-700 flex-1 truncate">
            {wrongMode
              ? `${tt('practice_wrong_review')} · ${wrongIdx + 1}/${wrongList.length}`
              : `${bookTitle} · ${tt('practice_question')}${currentIndex + 1}`}
          </h2>
          {wrongMode && (
            <button onClick={() => { setWrongMode(false); setTipText('') }}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-all">
              ← {tt('practice_exit_wrong')}
            </button>
          )}
          {mode !== 'dictation' && (
            <button
              onClick={handlePlayAudio}
              className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-700
                         bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-all"
            >
              🔊 {tt('practice_play')}
            </button>
          )}
        </div>

        {!wrongMode && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 min-w-0"><LessonSelector lang={lang} /></div>
            <div className="flex items-center gap-2">
              {hasTextbookVocab && onGoToWords && (
                <button
                  onClick={handleGoToWords}
                  className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800
                             bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap"
                >
                  {tt('vocab_practice_btn')}
                </button>
              )}
              <ModeSwitcher lang={lang} />
            </div>
          </div>
        )}
        {wrongMode && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-600 font-medium">🔁 {tt('practice_wrong_hint')}</span>
            <span className="text-xs text-slate-400">{tt('practice_pass_count')} {passCount} {tt('practice_times')} 🏅</span>
          </div>
        )}
      </div>

      {/* ====== 进度条 ====== */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${wrongMode ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
          {wrongMode ? `${wrongIdx + 1}/${wrongList.length}` : `${currentIndex + 1}/${totalSentences}`}
        </span>
      </div>

      {/* ====== 练习区域 ====== */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-6 animate-scale-in relative overflow-hidden">
        {showXpFloat && (
          <div className="absolute top-4 right-6 text-lg font-black text-amber-500 animate-xp-float pointer-events-none z-10">
            +10 XP
          </div>
        )}
        {showCoin && (
          <div className="absolute top-4 left-6 text-xl pointer-events-none z-10 animate-xp-float">
            🪙 +1
          </div>
        )}

        <div className="flex items-center gap-2 mb-5">
          <span className="text-base">
            {wrongMode ? '📋' : mode === 'drag' ? '🧩' : mode === 'type' ? '⌨️' : '🎧'}
          </span>
          <span className="text-sm font-semibold text-slate-500 flex-1">
            {wrongMode ? tt('practice_wrong_review') : mode === 'drag' ? tt('drag_words_hint') : mode === 'type' ? tt('type_placeholder') : tt('dict_label')}
          </span>
          {!wrongMode && (mode === 'type' || mode === 'dictation') && (
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => { setChunked(false); sfx.play('click') }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${!chunked ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'}`}
              >
                {tt('practice_full_mode')}
              </button>
              <button
                onClick={() => { setChunked(true); sfx.play('click') }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${chunked ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'}`}
              >
                {tt('practice_chunk_mode')}
              </button>
            </div>
          )}
          {!wrongMode && mode === 'drag' && wrongList.length > 0 && (
            <button
              onClick={() => { setWrongMode(true); setWrongIdx(0); setTipText('') }}
              className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-800
                         bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap"
            >
              📋 {tt('practice_wrong_count')} <span className="bg-amber-500 text-white rounded-full px-1.5 py-0 text-[10px] font-bold">{wrongList.length}</span>
            </button>
          )}
        </div>

        {(wrongMode || mode === 'drag') && activeSentence && (
          <DragPractice key={wrongMode ? `wrong-${wrongIdx}-${activeSentence.cn}` : `drag-${currentIndex}`}
            sentence={activeSentence} onWordClick={handleWordClick} onAnswer={handleAnswer} lang={lang} />
        )}
        {!wrongMode && mode === 'type' && sentence && (
          chunked ? (
            <ChunkedTypePractice key={`chunk-type-${currentIndex}`} sentence={sentence} mode="type"
              onAnswer={handleAnswer} onPlayAudio={handlePlayAudio} onPlayChunkAudio={handlePlayChunkAudio} lang={lang} />
          ) : (
            <TypePractice key={`type-${currentIndex}`} sentence={sentence} onAnswer={handleAnswer} lang={lang} />
          )
        )}
        {!wrongMode && mode === 'dictation' && sentence && (
          chunked ? (
            <ChunkedTypePractice key={`chunk-dict-${currentIndex}`} sentence={sentence} mode="dictation"
              onAnswer={handleAnswer} onPlayAudio={handlePlayAudio} onPlayChunkAudio={handlePlayChunkAudio} lang={lang} />
          ) : (
            <DictationPractice key={`dict-${currentIndex}`} onAnswer={handleAnswer} onPlayAudio={handlePlayAudio} lang={lang} />
          )
        )}

        {tipText && (
          <div
            className={`mt-5 text-center text-base font-bold py-3 px-4 rounded-xl transition-all animate-scale-in break-words ${
              tipColor === 'green'
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                : 'text-red-600 bg-red-50 border border-red-200/60'
            }`}
          >
            {tipText}
          </div>
        )}

        <div className="flex justify-center gap-3 mt-6 pt-4 border-t border-slate-100">
          {wrongMode ? (
            <>
              <button
                onClick={() => { if (wrongIdx > 0) { setWrongIdx(i => i - 1); setTipText('') } }}
                disabled={wrongIdx === 0}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold
                           bg-slate-50 border border-slate-200 text-slate-600
                           hover:bg-slate-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {tt('practice_prev_wrong')}
              </button>
              <button
                onClick={() => { if (wrongIdx < wrongList.length - 1) { setWrongIdx(i => i + 1); setTipText('') } }}
                disabled={wrongIdx >= wrongList.length - 1}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold
                           bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm
                           hover:shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {tt('practice_next_wrong')}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold
                           bg-slate-50 border border-slate-200 text-slate-600
                           hover:bg-slate-100 hover:border-slate-300 transition-all
                           disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {tt('practice_prev')}
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex >= totalSentences - 1}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold
                           bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm
                           hover:shadow-md hover:from-blue-600 hover:to-indigo-600 transition-all
                           disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {tt('practice_next')}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </>
          )}
        </div>
      </div>

      <WordPopup word={popupWord} pinyin={popupPinyin} meaning={popupMeaning}
        open={popupOpen} onOpenChange={setPopupOpen} lang={lang} />
    </div>
  )
}
