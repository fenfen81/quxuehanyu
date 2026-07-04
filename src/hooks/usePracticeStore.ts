import { create } from 'zustand'
import type { PracticeMode, PracticeState } from '@/types'

export const usePracticeStore = create<PracticeState>((set) => ({
  mode: 'drag',
  currentTextbookId: null,
  currentLessonId: null,
  currentTextId: null,
  currentIndex: 0,
  setMode: (mode: PracticeMode) => set({ mode }),
  setTextbook: (id: string) => set({ currentTextbookId: id, currentLessonId: null, currentTextId: null, currentIndex: 0 }),
  setLesson: (id: string) => set({ currentLessonId: id, currentTextId: null, currentIndex: 0 }),
  setText: (id: string) => set({ currentTextId: id, currentIndex: 0 }),
  setCurrentIndex: (i: number) => set({ currentIndex: i }),
}))
