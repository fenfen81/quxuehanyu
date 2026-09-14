import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Session } from '@supabase/supabase-js'
import type { Lang } from '@/i18n/translations'

type ClassRow = {
  id: string
  name: string
  grade: string | null
  invite_code: string
  created_at: string
}

type TaskRow = {
  id: string
  class_id: string
  title: string
  type: 'textbook' | 'custom'
  textbook_ref: { bookId?: string; bookTitle?: string } | null
  custom_text: string | null
  audio_url: string | null
  due_at: string | null
  created_at: string
}

type SubmissionRow = {
  task_id: string
  status: 'assigned' | 'submitted' | 'completed'
  submitted_at: string | null
}

/** 学生端：输邀请码进班 + 我的班级 + 我的任务 + 标记完成 */
export function StudentClassesPage({ session, lang = 'zh', onGoTeacher }: {
  session: Session
  lang?: Lang
  onGoTeacher?: () => void
}) {
  const uid = session.user.id

  const [classes, setClasses] = useState<ClassRow[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [subs, setSubs] = useState<Record<string, SubmissionRow>>({})
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    // 我的班级
    const { data: cm, error: e1 } = await supabase
      .from('class_members')
      .select('class:classes(id, name, grade, invite_code, created_at)')
      .eq('student_id', uid)
    const myClasses: ClassRow[] = (cm || []).map((r: any) => r.class).filter(Boolean)
    setClasses(myClasses)

    let e2: { message: string } | null = null
    let e3: { message: string } | null = null
    if (myClasses.length > 0) {
      const ids = myClasses.map(c => c.id)
      const { data: tk, error: tkErr } = await supabase
        .from('tasks')
        .select('*')
        .in('class_id', ids)
        .order('created_at', { ascending: false })
      e2 = tkErr
      setTasks((tk as TaskRow[]) || [])
      const { data: sb, error: sbErr } = await supabase
        .from('task_submissions')
        .select('task_id, status, submitted_at')
        .eq('student_id', uid)
      const map: Record<string, SubmissionRow> = {}
      ;(sb || []).forEach((r: SubmissionRow) => { map[r.task_id] = r })
      e3 = sbErr
      setSubs(map)
    } else {
      setTasks([])
      setSubs({})
    }
    const err = e1 || e2 || e3
    if (err) setMsg({ kind: 'err', text: '数据读取失败：' + err.message })
    setLoading(false)
  }, [uid])

  useEffect(() => { load() }, [load])

  const join = async () => {
    setMsg(null)
    if (!code.trim()) { setMsg({ kind: 'err', text: '请输入邀请码' }); return }
    const { error } = await supabase.rpc('join_class', { p_code: code.trim() })
    if (error) {
      const isInvalid = String(error.message).toUpperCase().includes('INVALID_CODE')
      setMsg({ kind: 'err', text: isInvalid ? '邀请码无效，请检查后重试' : ('加入失败：' + error.message) })
      return
    }
    setMsg({ kind: 'ok', text: '已成功加入班级！' })
    setCode('')
    await load()
  }

  const markDone = async (taskId: string) => {
    const { error } = await supabase
      .from('task_submissions')
      .upsert({ task_id: taskId, student_id: uid, status: 'submitted', submitted_at: new Date().toISOString() },
              { onConflict: 'task_id,student_id' })
    if (error) { setMsg({ kind: 'err', text: '提交失败：' + error.message }); return }
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xl shadow-sm">🎓</div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{lang === 'en' ? 'My Classes' : '我的班级'}</h2>
          <p className="text-sm text-slate-400">{lang === 'en' ? 'Join with an invite code and do your tasks' : '用邀请码加入班级，完成老师布置的任务'}</p>
        </div>
      </div>

      {onGoTeacher && (
        <button onClick={onGoTeacher}
          className="inline-flex items-center gap-2 text-sm text-indigo-600 font-medium hover:underline">
          📚 {lang === 'en' ? 'Switch to Teacher Center' : '切换到老师中心'}
        </button>
      )}

      {/* 进班 */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <label className="text-sm font-semibold text-slate-600">{lang === 'en' ? 'Join a class with invite code' : '用邀请码加入班级'}</label>
        <div className="flex gap-2 mt-2">
          <input value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="ABC12345"
            maxLength={8}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-base uppercase tracking-widest bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none" />
          <button onClick={join}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-bold text-sm hover:-translate-y-0.5 transition-all">
            {lang === 'en' ? 'Join' : '加入'}
          </button>
        </div>
        {msg && (
          <div className={`mt-2 text-sm font-medium ${msg.kind === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>{msg.text}</div>
        )}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-10 animate-pulse">加载中…</div>
      ) : (
        <>
          {/* 我的班级 */}
          <section>
            <h3 className="text-sm font-bold text-slate-500 mb-2">{lang === 'en' ? 'My Classes' : '我的班级'}（{classes.length}）</h3>
            {classes.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                {lang === 'en' ? 'Not in any class yet' : '还没有加入任何班级'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {classes.map(c => (
                  <div key={c.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <div className="font-bold text-slate-800">{c.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{c.grade || '—'} · {lang === 'en' ? 'Code' : '邀请码'}：{c.invite_code}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 我的任务 */}
          <section>
            <h3 className="text-sm font-bold text-slate-500 mb-2">{lang === 'en' ? 'My Tasks' : '我的任务'}（{tasks.length}）</h3>
            {tasks.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                {lang === 'en' ? 'No tasks assigned yet' : '老师还没有布置任务'}
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => {
                  const sub = subs[task.id]
                  const done = sub?.status === 'submitted' || sub?.status === 'completed'
                  return (
                    <div key={task.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-start gap-3">
                      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {done ? '✓' : '•'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800">{task.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {task.type === 'textbook'
                            ? `📖 ${task.textbook_ref?.bookTitle || '教材'}`
                            : `✍️ ${lang === 'en' ? 'Custom' : '自定义'}`}
                          {task.due_at && ` · ⏰ ${new Date(task.due_at).toLocaleDateString()}`}
                        </div>
                        {task.type === 'custom' && task.custom_text && (
                          <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{task.custom_text}</p>
                        )}
                        {task.audio_url && (
                          <audio controls src={task.audio_url} className="mt-2 w-full" />
                        )}
                        {task.type === 'textbook' && task.textbook_ref?.bookId && (
                          <button onClick={() => { /* 跳转练习（可选增强） */ }}
                            className="mt-1 text-xs text-indigo-600 hover:underline">{lang === 'en' ? 'Open practice →' : '去练习 →'}</button>
                        )}
                      </div>
                      {!done && (
                        <button onClick={() => markDone(task.id)}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600">
                          {lang === 'en' ? 'Done' : '标记完成'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default StudentClassesPage
