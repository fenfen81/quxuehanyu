import type { TbWordHit } from '../../lib/textbookLookup'
import type { TextbookWord } from '../../data/textbookDict'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'
import { SpeakButton } from '../SpeakButton'

interface Props {
  hit: TbWordHit
  lang: Lang
  onClose: () => void
  onStartLesson: (textbookId: string, lessonId: string) => void
  onStudyWords: (words: TextbookWord[], label: string) => void
}

/**
 * 教材查词 · 词条详情弹窗
 * 一个词形可能出现在多本教材的多个课次里（如「了」出现在 6 本教材 7 个课次），
 * 这里把所有出现位置连同该处的拼音 / 词性 / 释义 / 例句一并列出，
 * 既方便学生回看原文语境，也方便研究者比较同一词在不同教材的处理方式。
 */
export function WordLookupDialog({ hit, lang, onClose, onStartLesson, onStudyWords }: Props) {
  const occ = hit.occurrences
  const bookTitles = Array.from(new Set(occ.map(o => o.textbookTitle)))
  const first = occ[0]
  const pinyins = Array.from(new Set(occ.map(o => o.pinyin)))

  const words: TextbookWord[] = occ.map(o => ({
    id: o.wordId,
    hanzi: hit.hanzi,
    pinyin: o.pinyin,
    pos: o.pos,
    english: o.english,
    exampleCn: o.exampleCn,
    exampleEn: o.exampleEn,
    examplePinyin: o.examplePinyin,
  }))

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[86vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 词头 */}
        <div className="bg-sky-50 border-b border-sky-100 px-5 py-4 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl sm:text-4xl font-black text-slate-800 font-kai">{hit.hanzi}</span>
              <SpeakButton text={hit.hanzi} wordId={first.wordId} className="w-9 h-9 text-lg bg-white text-sky-600 shadow-sm" />
            </div>
            <div className="mt-1 text-base text-sky-700 font-medium">
              {pinyins.join(' / ')}
            </div>
            <div className="mt-1.5 text-xs text-slate-500">
              {t('tb_lookup_found_in', lang)} {bookTitles.length} {t('tb_books', lang)} · {occ.length} {t('tb_lesson_times', lang)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-full bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-lg"
            aria-label={t('close', lang)}
          >✕</button>
        </div>

        {/* 出现位置列表 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <h4 className="text-sm font-bold text-slate-500">{t('tb_lookup_occurrences', lang)}</h4>
          {occ.map((o, i) => (
            <div key={`${o.wordId}-${i}`} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-sky-300 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 text-[15px]">
                    {lang === 'en' ? o.textbookTitleEn : o.textbookTitle}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {lang === 'en' ? `Lesson ${o.lessonNum}` : o.lessonTitle}
                  </div>
                </div>
                <button
                  onClick={() => { onStartLesson(o.textbookId, o.lessonId); onClose() }}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors"
                >{t('tb_go_lesson', lang)} ›</button>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="text-sky-700 font-medium">{o.pinyin}</span>
                {o.pos && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px] text-slate-500">{o.pos}</span>}
                <span className="text-slate-700">{o.english}</span>
              </div>

              {o.exampleCn && (
                <div className="mt-2.5 rounded-lg bg-slate-50 px-3 py-2 flex items-start gap-2">
                  <SpeakButton text={o.exampleCn} wordId={o.wordId + '-ex'} className="w-6 h-6 text-xs bg-white text-slate-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 text-sm">
                    <div className="text-slate-700 leading-relaxed">{o.exampleCn}</div>
                    {o.exampleEn && <div className="text-slate-400 text-xs mt-0.5 leading-relaxed">{o.exampleEn}</div>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 底部操作 */}
        <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-3 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50"
          >{t('close', lang)}</button>
          <button
            onClick={() => { onStudyWords(words, hit.hanzi); onClose() }}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-sm"
          >▶ {t('tb_study_word', lang)}</button>
        </div>
      </div>
    </div>
  )
}
