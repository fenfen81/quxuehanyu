import { supabase } from './supabaseClient'
import type { HskWord } from '@/data/hskWords'

export interface Progress {
  xp: number
  streak: number
  totalDone: number
  wrongWords: HskWord[]
}

// 从本地缓存兜底（首次登录、或云端还没数据时用于迁移旧进度）
function localFallback(): Progress {
  return {
    xp: parseInt(localStorage.getItem('juyou-xp') || '0', 10) || 0,
    streak: parseInt(localStorage.getItem('juyou-streak') || '0', 10) || 0,
    totalDone: parseInt(localStorage.getItem('juyou-done') || '0', 10) || 0,
    wrongWords: (() => {
      try { return JSON.parse(localStorage.getItem('quxue-wrong-words') || '[]') as HskWord[] }
      catch { return [] }
    })(),
  }
}

// 读取某用户的云端进度；没有记录时回退到本地缓存（并交给 saveProgress 落库）
export async function loadProgress(userId: string): Promise<Progress> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('xp, streak, total_done, wrong_words')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return localFallback()

  return {
    xp: (data.xp as number) ?? 0,
    streak: (data.streak as number) ?? 0,
    totalDone: (data.total_done as number) ?? 0,
    wrongWords: (data.wrong_words as HskWord[]) ?? [],
  }
}

// 写入/更新某用户的云端进度（upsert，按 user_id 去重）
export async function saveProgress(userId: string, p: Progress): Promise<void> {
  const { error } = await supabase
    .from('user_progress')
    .upsert(
      {
        user_id: userId,
        xp: p.xp,
        streak: p.streak,
        total_done: p.totalDone,
        wrong_words: p.wrongWords,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
  if (error) console.error('[saveProgress] 写入云端失败:', error.message)
}
