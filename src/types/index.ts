export type CategorySlug = 'comprehensive' | 'hsk' | 'oral' | 'vocational'

export interface Category {
  slug: CategorySlug
  name: string
  nameEn: string
  description: string
  icon: string
}

export interface Textbook {
  id: string
  categoryId: CategorySlug
  title: string
  titleEn: string
  level: string
  lessons: Lesson[]
}

export interface Lesson {
  id: string
  title: string
  titleEn: string
  texts: LessonText[]
}

export interface LessonText {
  id: string
  label: string
  sentences: Sentence[]
}

export interface Sentence {
  id: string
  cn: string
  split: string
  en: string
  dict: Record<string, string>
  /** 预生成的意群分段（人工校订，拼接 === cn）。存在时优先于 chunkSentence 启发式切分 */
  chunk?: string[]
  /** 分段英文：与分段输出一一对应；打字/听写模式按段展示英文 */
  chunkEn?: string[]
}

export type PracticeMode = 'drag' | 'type' | 'dictation'

export interface PracticeState {
  mode: PracticeMode
  currentTextbookId: string | null
  currentLessonId: string | null
  currentTextId: string | null
  currentIndex: number
  setMode: (mode: PracticeMode) => void
  setTextbook: (id: string) => void
  setLesson: (id: string) => void
  setText: (id: string) => void
  setCurrentIndex: (i: number) => void
}
