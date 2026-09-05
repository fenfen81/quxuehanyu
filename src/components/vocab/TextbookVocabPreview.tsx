import { useState } from 'react'
import { textbookVocabList } from '../../data/textbookDict'
import { getTextbookStats, getWordOccurrences } from '../../lib/textbookLookup'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'
import { SpeakButton } from '../SpeakButton'

interface Props {
  textbookId: string
  lang: Lang
  onClose: () => void
  onStartLesson: (textbookId: string, lessonId: string) => void
  /** 点击任意词 → 跳到它的跨教材出现详情（含例句） */
  onLookupWord?: (hanzi: string) => void
}

function fallbackCopy(text: string, done: () => void) {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    done()
  } catch {}
}

/** 整本教材生词表：按课分组一览全部词条，供通读与研究（收词量 / 重复词分布） */
export function TextbookVocabPreview({ textbookId, lang, onClose, onStartLesson, onLookupWord }: Props) {
  const [repeatOnly, setRepeatOnly] = useState(false)
  const [copied, setCopied] = useState(false)

  const tb = textbookVocabList.find(x => x.textbookId === textbookId)
  const stats = getTextbookStats(textbookId)
  if (!tb || !stats) return null

  const bookTitle = lang === 'en' ? tb.titleEn : tb.title

  const groups = tb.lessons
    .map(lesson => ({
      lesson,
      words: repeatOnly ? lesson.words.filter(w => getWordOccurrences(w.hanzi).length > 1) : lesson.words,
    }))
    .filter(g => g.words.length > 0)

  const statLine = t('tb_book_stats', lang)
    .replace('{lessons}', String(stats.lessonCount))
    .replace('{entries}', String(stats.entryCount))
    .replace('{unique}', String(stats.uniqueCount))
    .replace('{repeat}', String(stats.repeatFormCount))

  const handleCopy = () => {
    const lines: string[] = []
    lines.push(`${bookTitle} — ${lang === 'en' ? 'Full vocabulary list' : '全册生词表'}`)
    lines.push(statLine)
    for (const g of groups) {
      const lt = lang === 'en' ? g.lesson.lessonTitleEn : g.lesson.lessonTitle
      lines.push('')
      lines.push(`${lt}（${g.words.length} ${lang === 'en' ? 'words' : '词'}）`)
      g.words.forEach((w, i) => {
        lines.push(`${i + 1}. ${w.hanzi} / ${w.pinyin}${w.pos ? ' / ' + w.pos : ''} / ${w.english}`)
      })
    }
    const text = lines.join('\n')
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2000) }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done))
    } else {
      fallbackCopy(text, done)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="bg-indigo-50 border-b border-indigo-100 px-5 py-4 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-black text-slate-800">{bookTitle}</h3>
            <div className="mt-1 text-xs text-slate-600 leading-relaxed">{statLine}</div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-full bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-lg"
            aria-label={t('close', lang)}
          >✕</button>
        </div>

        {/* 工具条 */}
        <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-2 flex-wrap bg-white">
          <button
            onClick={() => setRepeatOnly(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${!repeatOnly ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
          >{t('tb_filter_all', lang)}</button>
          <button
            onClick={() => setRepeatOnly(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${repeatOnly ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
          >{t('tb_filter_repeat', lang)} · {stats.repeatEntryCount}</button>
          <span className="flex-1" />
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
          >{copied ? `✓ ${t('tb_copied', lang)}` : `📋 ${t('tb_copy_list', lang)}`}</button>
        </div>

        {/* 词表（按课分组） */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3">
          {groups.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">{t('tb_empty_filter', lang)}</div>
          ) : (
            groups.map(g => {
              const lt = lang === 'en' ? g.lesson.lessonTitleEn : g.lesson.lessonTitle
              return (
                <section key={g.lesson.lessonId} className="mb-4">
                  <div className="sticky top-0 z-10 bg-white/95 backdrop-blur py-1.5 flex items-center gap-2 border-b border-slate-100">
                    <h4 className="font-bold text-slate-700 text-sm">{lt}</h4>
                    <span className="text-[11px] text-slate-400">{g.words.length} {t('tb_words_short', lang)}</span>
                    <span className="flex-1" />
                    <button
                      onClick={() => { onStartLesson(tb.textbookId, g.lesson.lessonId); onClose() }}
                      className="px-2 py-0.5 rounded text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >{t('tb_go_lesson', lang)} ›</button>
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    {g.words.map((w, i) => {
                      const elsewhere = getWordOccurrences(w.hanzi).length
                      return (
                        <li key={w.id}>
                          <button
                            onClick={() => onLookupWord?.(w.hanzi)}
                            className="w-full text-left flex items-baseline gap-2 py-1.5 px-1 rounded hover:bg-indigo-50 transition-colors group"
                          >
                            <span className="w-5 shrink-0 text-right text-[11px] text-slate-300 font-bold">{i + 1}</span>
                            <span className="text-base font-bold text-slate-800 font-kai shrink-0">{w.hanzi}</span>
                            <SpeakButton text={w.hanzi} wordId={w.id} className="w-5 h-5 text-[10px] text-indigo-400 shrink-0" />
                            <span className="text-xs text-indigo-600 shrink-0">{w.pinyin}</span>
                            {w.pos && <span className="px-1 rounded bg-slate-100 text-[10px] text-slate-400 shrink-0">{w.pos}</span>}
                            <span className="text-xs text-slate-500 truncate">{w.english}</span>
                            {elsewhere > 1 && (
                              <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700">
                                {t('tb_total_places', lang).replace('{n}', String(elsewhere))}
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })
          )}
        </div>

        {/* 底部 */}
        <div className="border-t border-slate-100 px-5 py-3 flex justify-end bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50"
          >{t('close', lang)}</button>
        </div>
      </div>
    </div>
  )
}
