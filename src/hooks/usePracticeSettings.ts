import { create } from 'zustand'
import { sfx } from '@/utils/sfx'

// ── 句子练习可配置项 ──────────────────────────────────────────────
// 字体大小档位（sm 最小，xxl 最大）
export type FontSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
// 显示风格（浅蓝=默认；纯白；浅灰；深色）
export type ThemeStyle = 'blue' | 'white' | 'gray' | 'dark'
// 音频播放速度
export type AudioRate = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2

export interface PracticeSettings {
  fontSize: FontSize
  audioRate: AudioRate
  autoPlayTimes: number // 0 = 手动播放；1~5 = 自动播放次数
  keyboardSound: boolean
  theme: ThemeStyle
  setFontSize: (v: FontSize) => void
  setAudioRate: (v: AudioRate) => void
  setAutoPlayTimes: (v: number) => void
  setKeyboardSound: (v: boolean) => void
  setTheme: (v: ThemeStyle) => void
}

const KEY = 'qx_practice_settings'

type PersistShape = Pick<
  PracticeSettings,
  'fontSize' | 'audioRate' | 'autoPlayTimes' | 'keyboardSound' | 'theme'
>

function load(): PersistShape {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const o = JSON.parse(raw) as Partial<PersistShape>
      return {
        fontSize: o.fontSize ?? 'lg',
        audioRate: o.audioRate ?? 1,
        autoPlayTimes: o.autoPlayTimes ?? 0,
        keyboardSound: (() => { try { return localStorage.getItem('quxue-sfx') !== 'off' } catch { return true } })(),
        theme: o.theme ?? 'blue',
      }
    }
  } catch {
    /* ignore */
  }
  return { fontSize: 'lg', audioRate: 1, autoPlayTimes: 0, keyboardSound: true, theme: 'blue' }
}

function persist(s: PersistShape) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export const usePracticeSettings = create<PracticeSettings>((set, get) => {
  const initial = load()
  const save = (patch: Partial<PersistShape>) => {
    const next = { ...get(), ...patch } as PersistShape
    persist(next)
  }
  return {
    ...initial,
    setFontSize: (v) => {
      save({ fontSize: v })
      set({ fontSize: v })
    },
    setAudioRate: (v) => {
      save({ audioRate: v })
      set({ audioRate: v })
    },
    setAutoPlayTimes: (v) => {
      save({ autoPlayTimes: v })
      set({ autoPlayTimes: v })
    },
    setKeyboardSound: (v) => {
      sfx.enabled = v
      save({ keyboardSound: v })
      set({ keyboardSound: v })
    },
    setTheme: (v) => {
      save({ theme: v })
      set({ theme: v })
    },
  }
})

// ── 字号档位 → Tailwind class 映射 ───────────────────────────────
// shadcn/ui 的 <Input> 内部带 "md:text-sm"，所以必须同时给 md: 断点，否则桌面端会被覆盖。
// 输入框 / 整句输入
export const INPUT_FONT: Record<FontSize, string> = {
  sm: 'text-base md:text-base',
  md: 'text-lg md:text-lg',
  lg: 'text-xl md:text-xl',
  xl: 'text-2xl md:text-2xl',
  xxl: 'text-4xl md:text-4xl',
}
// 拼句词块（比输入框略大，便于拖拽观察）
export const CHIP_FONT: Record<FontSize, string> = {
  sm: 'text-lg md:text-lg',
  md: 'text-xl md:text-xl',
  lg: 'text-2xl md:text-2xl',
  xl: 'text-3xl md:text-3xl',
  xxl: 'text-5xl md:text-5xl',
}
// 提示 / 已完成段等小字
export const HINT_FONT: Record<FontSize, string> = {
  sm: 'text-xs md:text-xs',
  md: 'text-sm md:text-sm',
  lg: 'text-base md:text-base',
  xl: 'text-lg md:text-lg',
  xxl: 'text-xl md:text-xl',
}
// 输入框高度随字号变化，避免超大字被截断
export const INPUT_HEIGHT: Record<FontSize, string> = {
  sm: 'h-12',
  md: 'h-14',
  lg: 'h-16',
  xl: 'h-20',
  xxl: 'h-24',
}
