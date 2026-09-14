import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Session } from '@supabase/supabase-js'
import type { Lang } from '@/i18n/translations'
import type { WrongWordEntry } from '@/lib/learningReport'
import { textbooks } from '@/data/content'

type ClassRow = {
  id: string
  name: string
  grade: string | null
  invite_code: string
  created_at: string
  member_count?: number
}

type LearnRec = {
  id: string
  task_id: string
  class_id: string
  student_id: string
  kind: string
  textbook_id: string
  lesson_id: string
  lesson_title: string | null
  total: number
  viewed: number
  correct: number
  wrong: number
  accuracy: number | null
  wrong_words: WrongWordEntry[]
  learned_words: WrongWordEntry[]
  duration_sec: number
  created_at: string
  updated_at: string
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
  const [tLesson, setTLesson] = useState('')
  const [tFocus, setTFocus] = useState<'sentences' | 'vocab'>('sentences')
  const [tCustom, setTCustom] = useState('')
  const [tAudio, setTAudio] = useState<File | null>(null)
  const [tDue, setTDue] = useState('')
  const [posting, setPosting] = useState(false)

  // 进度（真实学情）
  const [learn, setLearn] = useState<LearnRec[]>([])
  const [stuName, setStuName] = useState<Record<string, string>>({})
  const [taskTitleMap, setTaskTitleMap] = useState<Record<string, string>>({})
  const [progLoading, setProgLoading] = useState(false)
  const [progErr, setProgErr] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
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

  // 切换到进度页时拉真实学情（RLS 已限制为本老师的班）
  useEffect(() => {
    if (tab !== 'progress' || classes.length === 0) return
    ;(async () => {
      setProgLoading(true)
      setProgErr(null)
      try {
        const classIds = classes.map(c => c.id)
        // 1) 学情明细
        const { data: recs, error: rErr } = await supabase
          .from('learning_records').select('*').order('updated_at', { ascending: false })
        if (rErr) { setProgErr('学情读取失败：' + rErr.message); return }
        const list = (recs as LearnRec[]) || []
        setLearn(list)
        // 2) 任务标题
        const { data: tks } = await supabase
          .from('tasks').select('id, title').in('class_id', classIds)
        const tm: Record<string, string> = {}
        ;(tks || []).forEach((t: any) => { tm[t.id] = t.title })
        setTaskTitleMap(tm)
        // 3) 学生姓名（RLS 允许老师读自己班学生 profiles）
        const stuIds = Array.from(new Set(list.map(r => r.student_id)))
        if (stuIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles').select('id, display_name, full_name, email').in('id', stuIds)
          const m: Record<string, string> = {}
          ;(profs || []).forEach((p: any) => {
            m[p.id] = p.display_name || p.full_name || (p.email ? String(p.email).split('@')[0] : '学生')
          })
          setStuName(m)
        } else setStuName({})
      } catch (e: any) {
        setProgErr('读取失败：' + (e?.message || e))
      } finally {
        setProgLoading(false)
      }
    })()
  }, [tab, classes])

  // 班级错词热榜（跨全部学情聚合）
  const hotWords = (() => {
    const m: Record<string, WrongWordEntry & { n: number }> = {}
    learn.forEach(r => (r.wrong_words || []).forEach(w => {
      if (!m[w.hanzi]) m[w.hanzi] = { ...w, n: 0 }
      m[w.hanzi].n++
    }))
    return Object.values(m).sort((a, b) => b.n - a.n).slice(0, 15)
  })()

  // 按任务分组
  const byTask = (() => {
    const m = new Map<string, LearnRec[]>()
    learn.forEach(r => { if (!m.has(r.task_id)) m.set(r.task_id, []); m.get(r.task_id)!.push(r) })
    return m
  })()

  const fmtDur = (s: number) => {
    if (s < 60) return `${s}秒`
    const m = Math.floor(s / 60)
    return m < 60 ? `${m}分${s % 60}秒` : `${Math.floor(m / 60)}时${m % 60}分`
  }

  // 导出 CSV
  const exportCsv = () => {
    const header = ['任务', '学生', '课次', '练词数', '答对', '答错', '正确率%', '用时(秒)', '错词']
    const rows = learn.map(r => [
      taskTitleMap[r.task_id] || r.task_id,
      stuName[r.student_id] || '学生',
      r.lesson_title || r.lesson_id || '',
      String(r.total), String(r.correct), String(r.wrong),
      r.accuracy != null ? String(r.accuracy) : '',
      String(r.duration_sec),
      (r.wrong_words || []).map(w => `${w.hanzi}(${w.pinyin})`).join(' '),
    ])
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `学情明细_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
    if (tType === 'textbook' && tFocus === 'vocab' && !tLesson) { setMsg({ kind: 'err', text: '背生词任务请先选择具体课次（生词按课匹配）' }); return }

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
      const les = tLesson ? b?.lessons.find(l => l.id === tLesson) : undefined
      row.textbook_ref = b ? { bookId: b.id, bookTitle: b.title, lessonId: les?.id, lessonTitle: les?.title, focus: tFocus } : null
      row.custom_text = null
    } else {
      row.textbook_ref = null
      row.custom_text = tCustom.trim() || null
    }

    const { error } = await supabase.from('tasks').insert(row)
    if (error) { setMsg({ kind: 'err', text: '发布失败：' + error.message }); return }
    setMsg({ kind: 'ok', text: '任务已发布！' })
      setTTitle(''); setTCustom(''); setTAudio(null); setTDue(''); setTClass(''); setTLesson(''); setTFocus('sentences')
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

  const selectedBook = textbooks.find(x => x.id === tBook)
  const lessonOptions = selectedBook?.lessons ?? []

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
            <>
            <div>
              <label className="text-xs font-semibold text-slate-500">{lang === 'en' ? 'Textbook' : '教材'}</label>
              <select value={tBook} onChange={e => { setTBook(e.target.value); setTLesson('') }}
                className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 text-base bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none">
                <option value="">{lang === 'en' ? 'Select a textbook' : '选择教材'}</option>
                {textbooks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>
            {tBook && lessonOptions.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-500">{lang === 'en' ? 'Lesson' : '课次（选填，不选则进入教材自选）'}</label>
                <select value={tLesson} onChange={e => setTLesson(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 text-base bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none">
                  <option value="">{lang === 'en' ? 'Whole textbook (pick lesson in app)' : '整本教材（进入后自行选课）'}</option>
                  {lessonOptions.map(l => <option key={l.id} value={l.id}>{lang === 'en' && l.titleEn ? l.titleEn : l.title}</option>)}
                </select>
              </div>
            )}
            <div className="mt-1">
              <label className="text-xs font-semibold text-slate-500">{lang === 'en' ? 'Task content' : '任务内容'}</label>
              <div className="flex gap-2 mt-1">
                <button onClick={() => setTFocus('sentences')}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold ${tFocus === 'sentences' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  📝 {lang === 'en' ? 'Sentence practice' : '课文句子'}
                </button>
                <button onClick={() => setTFocus('vocab')}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold ${tFocus === 'vocab' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  🗂 {lang === 'en' ? 'This lesson words' : '本课生词'}
                </button>
              </div>
              {tFocus === 'vocab' && !tLesson && (
                <p className="text-[11px] text-amber-600 mt-1">{lang === 'en' ? 'Tip: pick a lesson above so students jump straight to its words' : '提示：上方选择具体课次，学生可一步直达该课生词'}</p>
              )}
            </div>
          </> ) : (
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-500">{lang === 'en' ? 'Student progress' : '学生学情（真实练习数据）'}</h3>
            {learn.length > 0 && (
              <button onClick={exportCsv}
                className="text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all">
                ⬇ {lang === 'en' ? 'Export CSV' : '导出 CSV'}
              </button>
            )}
          </div>

          {progErr && (
            <div className="text-sm font-medium px-4 py-2.5 rounded-xl bg-red-50 text-red-600">{progErr}</div>
          )}

          {progLoading ? (
            <div className="text-center text-slate-400 py-10 animate-pulse">加载中…</div>
          ) : learn.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
              {lang === 'en' ? 'No practice data yet — students haven’t finished a task practice.' : '还没有学情数据：学生完成「背生词」任务练习后，这里会显示真实学习情况。'}
            </div>
          ) : (
            <>
              {/* 班级错词热榜 */}
              {hotWords.length > 0 && (
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold text-slate-700">🔥 {lang === 'en' ? 'Class weak spots' : '全班易错词热榜'}</span>
                    <span className="text-xs text-slate-400">{lang === 'en' ? 'words most students got wrong' : '（最多错的学生最多的词排前）'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hotWords.map(w => (
                      <span key={w.hanzi} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                        {w.hanzi}
                        <span className="text-[11px] text-red-400">{w.pinyin}</span>
                        <span className="text-[11px] bg-red-100 text-red-500 rounded-full px-1.5 font-bold">{w.n}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 按任务分组：每任务下每个学生一行 */}
              {Array.from(byTask.entries()).map(([taskId, recs]) => (
                <div key={taskId} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2">
                  <div className="font-bold text-slate-800">
                    {taskTitleMap[taskId] || taskId}
                    <span className="ml-2 text-xs font-normal text-slate-400">{recs[0]?.lesson_title || recs[0]?.lesson_id || ''}</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {recs.map(r => {
                      const acc = r.accuracy != null ? `${r.accuracy}%` : '—'
                      const isOpen = !!expanded[r.id]
                      return (
                        <div key={r.id} className="py-2">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-slate-700 min-w-[64px]">{stuName[r.student_id] || '学生'}</span>
                            <span className="text-xs text-slate-400">练 {r.viewed}/{r.total}</span>
                            <span className={`text-xs font-bold ${r.accuracy != null && r.accuracy >= 80 ? 'text-emerald-600' : r.accuracy != null && r.accuracy >= 50 ? 'text-amber-600' : 'text-red-500'}`}>正确率 {acc}</span>
                            <span className="text-xs text-slate-400">⏱ {fmtDur(r.duration_sec)}</span>
                            <button onClick={() => setExpanded(e => ({ ...e, [r.id]: !e[r.id] }))}
                              className="ml-auto text-xs text-indigo-500 hover:underline">
                              {r.wrong > 0 ? `错词 ${r.wrong}${isOpen ? ' ▲' : ' ▼'}` : (isOpen ? '▲' : '▾')}
                            </button>
                          </div>
                          {isOpen && (
                            <div className="mt-2 pl-1">
                              {r.wrong_words && r.wrong_words.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {r.wrong_words.map((w, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-600 text-xs">
                                      {w.hanzi}<span className="text-red-400">{w.pinyin}</span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400">{lang === 'en' ? 'No wrong words — all correct!' : '本轮没有答错，全部正确 👍'}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default TeacherPage
