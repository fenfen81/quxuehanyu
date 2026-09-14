import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Session } from '@supabase/supabase-js'
import type { Lang } from '@/i18n/translations'
import { textbooks } from '@/data/content'

type ClassRow = {
  id: string
  name: string
  grade: string | null
  invite_code: string
  created_at: string
  member_count?: number
}

type SubAgg = {
  task_id: string
  title: string
  total: number
  submitted: number
}

/** 老师中心：建班 / 发布任务 / 进度回收 */
export function TeacherPage({ session, lang = 'zh', onGoClasses }: {
  session: Session
  lang?: Lang
  onGoClasses?: () => void
}) {
  const uid = session.user.id

  const [tab, setTab] = useState<'classes' | 'tasks' | 'progress'>('classes')
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  // 建班表单
  const [cName, setCName] = useState('')
  const [cGrade, setCGrade] = useState('')

  // 发任务表单
  const [tClass, setTClass] = useState('')
  const [tTitle, setTTitle] = useState('')
  const [tType, setTType] = useState<'textbook' | 'custom'>('textbook')
  const [tBook, setTBook] = useState('')
  const [tCustom, setTCustom] = useState('')
  const [tAudio, setTAudio] = useState<File | null>(null)
  const [tDue, setTDue] = useState('')
  const [posting, setPosting] = useState(false)

  // 进度
  const [agg, setAgg] = useState<SubAgg[]>([])
  const [members, setMembers] = useState<Record<string, number>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setMsg(null)
    const { data: cls, error: e1 } = await supabase
      .from('classes')
      .select('id, name, grade, invite_code, created_at')
      .eq('created_by', uid)
      .order('created_at', { ascending: false })
    const myClasses: ClassRow[] = (cls as ClassRow[]) || []
    setClasses(myClasses)

    // 每班成员数 + 任务完成度
    const mmap: Record<string, number> = {}
    let e2: { message: string } | null = null
    for (const c of myClasses) {
      const { count, error: cErr } = await supabase
        .from('class_members').select('*', { count: 'exact', head: true })
        .eq('class_id', c.id)
      e2 = cErr
      mmap[c.id] = count || 0
    }
    setMembers(mmap)
    const err = e1 || e2
    if (err) setMsg({ kind: 'err', text: '数据读取失败：' + err.message })
    setLoading(false)
  }, [uid])

  useEffect(() => { load() }, [load])

  // 切换到进度页时拉聚合
  useEffect(() => {
    if (tab !== 'progress' || classes.length === 0) return
    ;(async () => {
      const ids = classes.map(c => c.id)
      const { data: tasks } = await supabase.from('tasks').select('id, class_id, title').in('class_id', ids)
      const taskIds = (tasks || []).map((x: any) => x.id)
      if (taskIds.length === 0) { setAgg([]); return }
      const { data: subs } = await supabase
        .from('task_submissions').select('task_id, status').in('task_id', taskIds)
      const map: Record<string, SubAgg> = {}
      ;(tasks || []).forEach((tk: any) => { map[tk.id] = { task_id: tk.id, title: tk.title, total: 0, submitted: 0 } })
      ;(subs || []).forEach((s: any) => {
        if (map[s.task_id]) { map[s.task_id].total++; if (s.status !== 'assigned') map[s.task_id].submitted++ }
      })
      setAgg(Object.values(map))
    })()
  }, [tab, classes])

  const genCode = () => Math.random().toString(36).slice(2, 10).toUpperCase().slice(0, 8)

  const createClass = async () => {
    setMsg(null)
    if (!cName.trim()) { setMsg({ kind: 'err', text: '请填写班级名称' }); return }
    let code = genCode()
    let inserted = null
    for (let i = 0; i < 5; i++) {
      const { data, error } = await supabase
        .from('classes')
        .insert({ name: cName.trim(), grade: cGrade.trim() || null, invite_code: code, created_by: uid })
        .select('id, name, grade, invite_code, created_at')
        .single()
      if (!error) { inserted = data; break }
      code = genCode()
    }
    if (!inserted) { setMsg({ kind: 'err', text: '建班失败，请重试' }); return }
    setMsg({ kind: 'ok', text: `班级「${cName.trim()}」已创建，邀请码：${code}` })
    setCName(''); setCGrade('')
    await load()
  }

  const postTask = async () => {
    setMsg(null)
    setPosting(true)
    try {
    if (!tClass) { setMsg({ kind: 'err', text: '请选择发布的班级' }); return }
    if (!tTitle.trim()) { setMsg({ kind: 'err', text: '请填写任务标题' }); return }

    let audioUrl: string | null = null
    if (tAudio) {
      const path = `${uid}/${Date.now()}_${tAudio.name}`
      const { error: upErr } = await supabase.storage.from('class-audio').upload(path, tAudio)
      if (upErr) { setMsg({ kind: 'err', text: '音频上传失败：' + upErr.message }); return }
      const { data: urlData } = supabase.storage.from('class-audio').getPublicUrl(path)
      audioUrl = urlData.publicUrl
    }

    const row: any = {
      class_id: tClass,
      created_by: uid,
      title: tTitle.trim(),
      type: tType,
      due_at: tDue ? new Date(tDue).toISOString() : null,
      audio_url: audioUrl,
    }
    if (tType === 'textbook') {
      const b = textbooks.find(x => x.id === tBook)
      row.textbook_ref = b ? { bookId: b.id, bookTitle: b.title } : null
      row.custom_text = null
    } else {
      row.textbook_ref = null
      row.custom_text = tCustom.trim() || null
    }

    const { error } = await supabase.from('tasks').insert(row)
    if (error) { setMsg({ kind: 'err', text: '发布失败：' + error.message }); return }
    setMsg({ kind: 'ok', text: '任务已发布！' })
      setTTitle(''); setTCustom(''); setTAudio(null); setTDue(''); setTClass('')
      await load()
    } finally {
      setPosting(false)
    }
  }

  const TabBtn = ({ id, label }: { id: typeof tab; label: string }) => (
    <button onClick={() => setTab(id)}
      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === id ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}>
      {label}
    </button>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl shadow-sm">📚</div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{lang === 'en' ? 'Teacher Center' : '老师中心'}</h2>
          <p className="text-sm text-slate-400">{lang === 'en' ? 'Create classes, assign tasks, track progress' : '建班、发布任务、查看学生进度'}</p>
        </div>
      </div>

      {onGoClasses && (
        <button onClick={onGoClasses}
          className="inline-flex items-center gap-2 text-sm text-emerald-600 font-medium hover:underline">
          🎓 {lang === 'en' ? 'Switch to My Classes' : '切换到我的班级'}
        </button>
      )}

      <div className="flex gap-2">
        <TabBtn id="classes" label={lang === 'en' ? 'Classes' : '我的班级'} />
        <TabBtn id="tasks" label={lang === 'en' ? 'Assign Task' : '发布任务'} />
        <TabBtn id="progress" label={lang === 'en' ? 'Progress' : '进度'} />
      </div>

      {msg && (
        <div className={`text-sm font-medium px-4 py-2.5 rounded-xl ${msg.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400 py-10 animate-pulse">加载中…</div>
      ) : tab === 'classes' ? (
        <div className="space-y-4">
          {/* 新建班级 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-600 mb-2">{lang === 'en' ? 'Create a class' : '新建班级'}</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={cName} onChange={e => setCName(e.target.value)} placeholder={lang === 'en' ? 'Class name (e.g. HSK1 周一班)' : '班级名称（如：HSK1 周一班）'}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-base bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none" />
              <input value={cGrade} onChange={e => setCGrade(e.target.value)} placeholder={lang === 'en' ? 'Grade (optional)' : '年级/教材（可选）'}
                className="sm:w-48 px-4 py-2.5 rounded-xl border border-slate-200 text-base bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none" />
              <button onClick={createClass}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-bold text-sm hover:-translate-y-0.5 transition-all">
                {lang === 'en' ? 'Create' : '创建'}
              </button>
            </div>
          </div>
          {/* 班级列表 */}
          {classes.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
              {lang === 'en' ? 'No classes yet' : '还没有班级，先创建一个吧'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {classes.map(c => (
                <div key={c.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-800">{c.name}</div>
                    <span className="text-xs text-slate-400">{members[c.id] || 0} {lang === 'en' ? 'students' : '名学生'}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{c.grade || '—'}</div>
                  <div className="mt-3 flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-slate-400">{lang === 'en' ? 'Invite code' : '邀请码'}</span>
                    <span className="font-black tracking-widest text-indigo-600">{c.invite_code}</span>
                    <button onClick={() => { navigator.clipboard?.writeText(c.invite_code); setMsg({ kind: 'ok', text: '邀请码已复制' }) }}
                      className="ml-auto text-xs text-indigo-500 hover:underline">{lang === 'en' ? 'Copy' : '复制'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : tab === 'tasks' ? (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-600">{lang === 'en' ? 'Assign a task' : '发布任务'}</h3>
          <div>
            <label className="text-xs font-semibold text-slate-500">{lang === 'en' ? 'To class' : '发布到班级'}</label>
            <select value={tClass} onChange={e => setTClass(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 text-base bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none">
              <option value="">{lang === 'en' ? 'Select a class' : '选择班级'}</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{lang === 'en' ? 'Task title' : '任务标题'}</label>
            <input value={tTitle} onChange={e => setTTitle(e.target.value)} placeholder={lang === 'en' ? 'e.g. Lesson 3 words' : '如：第三课生词'}
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 text-base bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTType('textbook')}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold ${tType === 'textbook' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              📖 {lang === 'en' ? 'From textbook' : '从教材挑'}
            </button>
            <button onClick={() => setTType('custom')}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold ${tType === 'custom' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              ✍️ {lang === 'en' ? 'Custom' : '老师自定义'}
            </button>
          </div>
          {tType === 'textbook' ? (
            <div>
              <label className="text-xs font-semibold text-slate-500">{lang === 'en' ? 'Textbook' : '教材'}</label>
              <select value={tBook} onChange={e => setTBook(e.target.value)}
                className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 text-base bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none">
                <option value="">{lang === 'en' ? 'Select a textbook' : '选择教材'}</option>
                {textbooks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-slate-500">{lang === 'en' ? 'Custom text' : '自定义文本/说明'}</label>
              <textarea value={tCustom} onChange={e => setTCustom(e.target.value)} rows={3}
                placeholder={lang === 'en' ? 'Write the task content...' : '写下任务内容/说明…'}
                className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 text-base bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none" />
              <label className="text-xs font-semibold text-slate-500 mt-2 block">{lang === 'en' ? 'Audio (optional)' : '音频（可选）'}</label>
              <input type="file" accept="audio/*" onChange={e => setTAudio(e.target.files?.[0] || null)}
                className="w-full mt-1 text-sm" />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-500">{lang === 'en' ? 'Due date (optional)' : '截止日期（可选）'}</label>
            <input type="date" value={tDue} onChange={e => setTDue(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 text-base bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none" />
          </div>
          <button onClick={postTask} disabled={posting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-bold hover:-translate-y-0.5 transition-all disabled:opacity-60">
            {posting ? (lang === 'en' ? 'Posting…' : '发布中…') : (lang === 'en' ? 'Publish Task' : '发布任务')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-500">{lang === 'en' ? 'Task progress' : '任务进度'}</h3>
          {agg.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
              {lang === 'en' ? 'No tasks yet' : '还没有任务'}
            </div>
          ) : (
            agg.map(a => (
              <div key={a.task_id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 truncate">{a.title}</span>
                  <span className="text-sm text-slate-500 shrink-0 ml-2">{a.submitted}/{a.total} {lang === 'en' ? 'done' : '完成'}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                    style={{ width: `${a.total ? (a.submitted / a.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default TeacherPage
