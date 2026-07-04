import { getTextbooksByCategory } from '@/data/content'
import type { CategorySlug, Textbook } from '@/types'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

interface TextbookListProps {
  categoryId: CategorySlug
  onSelectTextbook: (id: string) => void
  lang: Lang
}

export function TextbookList({ categoryId, onSelectTextbook, lang }: TextbookListProps) {
  const books = getTextbooksByCategory(categoryId)

  if (books.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-slate-400 font-medium">{t('no_textbooks', lang)}</p>
        <p className="text-xs text-slate-300 mt-1">{t('more_coming', lang)}</p>
      </div>
    )
  }

  const totalSentences = (book: Textbook) =>
    book.lessons.reduce((sum, l) => sum + l.texts.reduce((s, t) => s + t.sentences.length, 0), 0)

  const levelColors: Record<string, string> = {
    '初级': 'bg-blue-50 text-blue-600 border-blue-100',
    '中级': 'bg-amber-50 text-amber-600 border-amber-100',
    '高级': 'bg-red-50 text-red-600 border-red-100',
  }

  // Translate level if in English mode
  const levelLabel = (level: string): string => {
    const map: Record<string, string> = {
      '初级': t('level_beginner', lang),
      '中级': t('level_intermediate', lang),
      '高级': t('level_advanced', lang),
    }
    return map[level] || level
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {books.map((book: Textbook, i: number) => (
        <button
          key={book.id}
          onClick={() => onSelectTextbook(book.id)}
          className="group text-left bg-white rounded-2xl border border-slate-200/60 p-5
                     hover:shadow-xl hover:-translate-y-1 hover:border-blue-200
                     transition-all duration-300 animate-slide-up"
          style={{ animationDelay: `${i * 0.06 + 0.1}s`, animationFillMode: 'both' }}
        >
          {/* 顶部渐变条 */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-400 
                         opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl" 
               style={{ position: 'relative', marginBottom: '12px' }} />

          {/* 标题行 */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center
                           text-lg group-hover:scale-110 transition-transform shadow-sm">
              📖
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[16px] text-slate-800 group-hover:text-blue-600 transition-colors leading-snug">
                {lang === 'en' ? book.titleEn : book.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{lang === 'en' ? book.title : book.titleEn}</p>
            </div>
          </div>

          {/* 底部信息标签 */}
          <div className="flex items-center gap-2 mt-4">
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border
                            ${levelColors[book.level] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
              {levelLabel(book.level)}
            </span>
            <span className="text-xs text-slate-400">
              {book.lessons.length} {t('lessons_unit', lang)}
            </span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-400">
              {totalSentences(book)} {t('sentences_unit', lang)}
            </span>
          </div>

          {/* 悬停箭头 */}
          <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-200
                        translate-x-1 group-hover:translate-x-0">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>
      ))}
    </div>
  )
}
