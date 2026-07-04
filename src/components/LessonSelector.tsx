import { getTextbookById } from '@/data/content'
import { usePracticeStore } from '@/hooks/usePracticeStore'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

interface LessonSelectorProps {
  lang?: Lang
}

export function LessonSelector({ lang = 'zh' }: LessonSelectorProps) {
  const { currentTextbookId, currentLessonId, currentTextId, setLesson, setText } =
    usePracticeStore()
  const book = currentTextbookId
    ? getTextbookById(currentTextbookId)
    : undefined

  if (!book) return null

  const lessons = book.lessons
  const currentLesson = lessons.find((l) => l.id === currentLessonId)
  const texts = currentLesson?.texts ?? []

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      {/* 课次选择 */}
      <div className="relative flex-1">
        <select
          value={currentLessonId ?? ''}
          onChange={(e) => setLesson(e.target.value)}
          className="w-full appearance-none bg-white border border-slate-200 rounded-lg text-sm
                     px-3 py-2.5 pr-9 cursor-pointer outline-none transition-colors
                     focus:border-blue-400 focus:ring-2 focus:ring-blue-100
                     text-slate-700 font-medium"
        >
          <option value="" disabled>{t('select_lesson', lang)}</option>
          {lessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lang === 'en' && lesson.titleEn ? lesson.titleEn : lesson.title}
            </option>
          ))}
        </select>
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
             width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* 课文选择 */}
      {currentLessonId && (
        <div className="relative flex-1">
          <select
            value={currentTextId ?? ''}
            onChange={(e) => setText(e.target.value)}
            className="w-full appearance-none bg-white border border-slate-200 rounded-lg text-sm
                       px-3 py-2.5 pr-9 cursor-pointer outline-none transition-colors
                       focus:border-blue-400 focus:ring-2 focus:ring-blue-100
                       text-slate-700 font-medium"
          >
            <option value="" disabled>{t('select_text', lang)}</option>
            {texts.map((text) => (
              <option key={text.id} value={text.id}>
                {text.label}
              </option>
            ))}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
               width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  )
}
