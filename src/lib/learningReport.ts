import { supabase } from './supabaseClient'

export interface WrongWordEntry {
  hanzi: string
  pinyin: string
  english: string
}

export interface LearningReport {
  taskId: string
  classId: string
  bookId: string
  lessonId: string
  lessonTitle?: string | null
  kind?: 'vocab' | 'sentences'
  mode?: string | null
  total: number
  viewed: number
  correct: number
  wrong: number
  wrongWords: WrongWordEntry[]
  learnedWords?: WrongWordEntry[]
  durationSec: number
}

/**
 * 学生完成「老师布置的任务」练习后，把本轮真实学情上报云端。
 * 由 RLS 保证：学生只能写入自己所在班级的任务；老师只能读取自己班的。
 */
export async function reportLearning(r: LearningReport): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: '未登录' }

    // 翻卡模式没有对错概念 → accuracy 为 null
    const accuracy = (r.correct + r.wrong) > 0
      ? Math.round((r.correct / (r.correct + r.wrong)) * 1000) / 10
      : null

    const { error } = await supabase
      .from('learning_records')
      .upsert({
        task_id: r.taskId,
        class_id: r.classId,
        student_id: user.id,
        kind: r.kind ?? 'vocab',
        mode: r.mode ?? null,
        textbook_id: r.bookId,
        lesson_id: r.lessonId,
        lesson_title: r.lessonTitle ?? null,
        total: r.total,
        viewed: r.viewed,
        correct: r.correct,
        wrong: r.wrong,
        accuracy,
        wrong_words: r.wrongWords,
        learned_words: r.learnedWords ?? [],
        duration_sec: r.durationSec,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'task_id,student_id,lesson_id' })

    if (error) return { ok: false, error: error.message }
    // 评分模式（四选一/打字）完成即视为任务完成，自动标记；翻卡浏览不算
    if (r.mode === 'quiz' || r.mode === 'type') {
      await markTaskCompleted(r.taskId)
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) }
  }
}

/**
 * 学生完成「有对错判定的评分练习」（四选一/打字）后，把对应任务标记为已完成。
 * 翻卡浏览模式不调用本函数（浏览不等于练习）。
 * 由 RLS 保证：学生只能写自己名下的提交行。
 */
export async function markTaskCompleted(taskId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: '未登录' }
    const { error } = await supabase
      .from('task_submissions')
      .upsert({
        task_id: taskId,
        student_id: user.id,
        status: 'completed',
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'task_id,student_id' })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) }
  }
}
