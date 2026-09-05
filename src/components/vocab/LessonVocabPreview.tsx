import { getLessonInfo, getWordOccurrences } from '../../lib/textbookLookup'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'
import { SpeakButton } from '../SpeakButton'

interface Props {
  textbookId: string
  lessonId: string
  lang: Lang
  onClose: () => void
  onStartLesson: (textbookId: string, lessonId: string) => void
  /** 点击「共 N 处」时，跳到该词的跨教材出现详情（研究者视角） */
  onLookupWord?: (hanzi: string) => void
}

/** 每课生词表预览：不进入练习，先整体看一遍这一课要学哪些词 */
export function LessonVocabPreview({ textbookId, lessonId, lang, onClose, onStartLesson, onLookupWord }: Props) {
  const info = getLessonInfo(textbookId, lessonId)
  if (!info) return null
  const { textbook, lesson } = info
  const bookTitle = lang === 'en' ? textbook.titleEn : textbook.title
  const lessonTitle = lang === 'en' ? lesson.lessonTitleEn : lesson.lessonTitle

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[86vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-4 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-emerald-600 font-medium">{bookTitle}</div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">{lessonTitle}</h3>
            <div className="mt-1 text-xs text-slate-500">
              {t('tb_word_count', lang).replace('{n}', String(lesson.words.length))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-full bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-lg"
            aria-label={t('close', lang)}
          >✕</button>
        </div>

        {/* 生词列表 */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3">
          <ul className="divide-y divide-slate-100">
            {lesson.words.map((w, i) => {
              const elsewhere = getWordOccurrences(w.hanzi).length
              return (
                <li key={w.id} className="py-3 flex items-start gap-3">
                  <span className="w-6 shrink-0 text-center text-xs text-slate-300 font-bold pt-1.5">{i + 1}</span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl sm:text-2xl font-black text-slate-800 font-kai">{w.hanzi}</span>
                      <SpeakButton text={w.hanzi} wordId={w.id} className="w-7 h-7 text-sm bg-slate-50 text-emerald-600" />
                      <span className="text-sm text-emerald-700">{w.pinyin}</span>
                      {w.pos && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px] text-slate-500">{w.pos}</span>}
                      {elsewhere > 1 && onLookupWord && (
                        <button
                          onClick={() => onLookupWord(w.hanzi)}
                          className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-700 hover:bg-amber-100 transition-colors"
                          title={t('tb_lookup_elsewhere', lang)}
                        >{t('tb_total_places', lang).replace('{n}', String(elsewhere))}</button>
                      )}
                    </div>
                    <div className="text-sm text-slate-600 mt-0.5">{w.english}</div>
                    {w.exampleCn && (
                      <div className="mt-1.5 rounded-lg bg-slate-50 px-3 py-1.5 flex items-start gap-2">
                        <SpeakButton text={w.exampleCn} wordId={w.id + '-ex'} className="w-5 h-5 text-[10px] bg-white text-slate-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-[13px] text-slate-700 leading-relaxed">{w.exampleCn}</div>
                          {w.exampleEn && <div className="text-[11px] text-slate-400 leading-relaxed">{w.exampleEn}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        {/* 底部操作 */}
        <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-3 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50"
          >{t('close', lang)}</button>
          <button
            onClick={() => { onStartLesson(textbookId, lessonId); onClose() }}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
          >▶ {t('tb_start_lesson', lang)}</button>
        </div>
      </div>
    </div>
  )
}
