import { useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { grantSurveyCredits, CREDIT } from '@/lib/credits'
import type { Session } from '@supabase/supabase-js'
import type { Lang } from '@/i18n/translations'
import { useLang } from '@/i18n/useLang'

// ══════════════════════════════════════════════════════════════════════════════
//  体验调查问卷（12 题，中英双语）— 提交后自动发 +200 积分（仅一次）
// ══════════════════════════════════════════════════════════════════════════════

const D = {
  zh: {
    title: '体验问卷',
    subtitle: '告诉我们你的真实感受，帮助我们做得更好',
    reward: '完成即送 +200 积分',
    progress: '答题进度',
    exitHint: '中途退出不扣积分',
    submit: '提交问卷',
    submitNote: '提交后自动到账 +200 积分，只发一次',
    // 题目
    q1: '总体满意度：你喜欢趣学汉语吗？',
    q1En: 'Overall, how much do you like QuXue Chinese?',
    q2: '你最常用 / 最喜欢的功能是？（可多选）',
    q2En: 'Which features do you use or like most?',
    q3: 'HSK 背单词功能好用吗？',
    q3En: 'How usable is the HSK vocabulary feature?',
    q4: '哪个练习模式对你帮助最大？（单选）',
    q4En: 'Which practice mode helps you most?',
    q5: '你的汉语水平是？（单选）',
    q5En: 'Your Chinese level?',
    q6: '你现在用哪套教材？（可多选）',
    q6En: 'Which textbook do you use?',
    q7: '你希望我们新增哪些汉语教材？（可多选 + 写下书名）',
    q7En: 'What textbooks would you like us to add?',
    q8: '遇到 bug 或不好用的地方？（选填）',
    q8En: 'Any bugs or friction you\u2019ve hit?',
    q9: '你愿意把网站推荐给同学吗？',
    q9En: 'How likely to recommend? 0 = not at all · 10 = definitely',
    q10: '每日登录送 100 积分，会让你更常来学吗？（单选）',
    q10En: 'Does the daily-login bonus bring you back?',
    q11: '你还希望网站增加什么新功能？（选填）',
    q11En: 'What new features would you like?',
    q12: '联系方式（选填，便于回访和会员内测通知）',
    q12En: 'Contact info (optional) — email / WhatsApp / WeChat',
    // 选项
    fFlashcard: '翻转词卡背单词', fDrag: '拖拽拼句', fType: '看英打中', fDict: '听力听写', fStroke: '汉字笔顺', fWrong: '错词本', fOther: '其他',
    levelZero: '零起点', levelNotSure: '不清楚',
    tbJiaocheng: '《汉语教程》', tbHskStd: '《HSK 标准教程》', tbXinShiyong: '《新实用汉语课本》', tbFazhan: '《发展汉语》', tbOther: '其他',
    nbComprehensive: '综合课', nbOral: '口语', nbBusiness: '商务', nbHsk: 'HSK 专项', nbChildren: '少儿', nbExam: '考试辅导', nbTcmTravel: '中医 / 旅游',
    dailyEveryday: '会，每天都来', dailySometimes: '会，偶尔来', dailyNone: '没影响',
    placeholders: {
      hskIssue: '哪个环节最难用：找词 / 发音 / 例句 / 释义 / 切换教材…',
      tbOther: '请填写教材名称，如：《博雅汉语》…',
      tbNeeds: '请写出具体书名，如：《发展汉语》口语第二册…',
      improvements: '例如：听写时拼音显示不对…',
      featuresOther: '其他功能，如：…',
      featureRequests: '例如：口语评分、AI 对话练习、汉字闯关游戏…',
      contact: '例如：david@example.com',
    },
    errRequired: '请完成所有必答题（带 * 的题目）再提交',
    submitting: '提交中…',
    successTitle: '提交成功！感谢你的反馈 🎉',
    successDesc: '200 积分已到账，快去继续学习吧！',
    alreadyClaimed: '答案已保存。问卷奖励之前已领取过，本次不再发放积分。',
    failDesc: '答案已保存，但积分发放失败，请到个人中心重试。',
    goProfile: '去个人中心',
    goHome: '返回首页',
    retry: '重试',
    requiredMark: '必答',
  },
  en: {
    title: 'Feedback Survey',
    subtitle: 'Tell us how you really feel — it helps us improve',
    reward: 'Complete & earn +200 credits',
    progress: 'Progress',
    exitHint: 'You can leave anytime — no credits deducted',
    submit: 'Submit Survey',
    submitNote: '+200 credits credited automatically, once only',
    q1: 'Overall, how much do you like QuXue Chinese?',
    q1En: '总体满意度：你喜欢趣学汉语吗？',
    q2: 'Which features do you use or like most? (multi-select)',
    q2En: '你最常用 / 最喜欢的功能是？（可多选）',
    q3: 'How usable is the HSK vocabulary feature?',
    q3En: 'HSK 背单词功能好用吗？',
    q4: 'Which practice mode helps you most? (single)',
    q4En: '哪个练习模式对你帮助最大？（单选）',
    q5: 'Your Chinese level?',
    q5En: '你的汉语水平是？（单选）',
    q6: 'Which textbook do you use? (multi-select)',
    q6En: '你现在用哪套教材？（可多选）',
    q7: 'What textbooks would you like us to add? (multi + title)',
    q7En: '你希望我们新增哪些汉语教材？（可多选 + 写下书名）',
    q8: 'Any bugs or friction you\u2019ve hit? (optional)',
    q8En: '遇到 bug 或不好用的地方？（选填）',
    q9: 'How likely are you to recommend us to classmates?',
    q9En: '你愿意把网站推荐给同学吗？0 = 不会 · 10 = 一定会',
    q10: 'Does the daily-login bonus (+100) make you come back?',
    q10En: '每日登录送 100 积分，会让你更常来学吗？（单选）',
    q11: 'What new features would you like? (optional)',
    q11En: '你还希望网站增加什么新功能？（选填）',
    q12: 'Contact info (optional — for follow-up & VIP beta)',
    q12En: '联系方式（选填，便于回访和会员内测通知）',
    fFlashcard: 'Flashcards', fDrag: 'Drag & Build', fType: 'EN→CN Typing', fDict: 'Dictation', fStroke: 'Strokes', fWrong: 'Wrong Book', fOther: 'Other',
    levelZero: 'Zero', levelNotSure: 'Not sure',
    tbJiaocheng: 'Hanyu Jiaocheng', tbHskStd: 'HSK Standard', tbXinShiyong: 'New Practical Chinese', tbFazhan: 'Developing Chinese', tbOther: 'Other',
    nbComprehensive: 'Comprehensive', nbOral: 'Oral/Speaking', nbBusiness: 'Business', nbHsk: 'HSK-specific', nbChildren: 'Kids', nbExam: 'Exam prep', nbTcmTravel: 'TCM / Travel',
    dailyEveryday: 'Yes, daily', dailySometimes: 'Sometimes', dailyNone: 'No effect',
    placeholders: {
      hskIssue: 'Hardest part: finding words / audio / examples / meanings / switching textbooks…',
      tbOther: 'Type the textbook name, e.g. Boya Chinese…',
      tbNeeds: 'Type the exact title, e.g. Developing Chinese Oral Vol.2…',
      improvements: 'e.g. dictation pinyin display is wrong…',
      featuresOther: 'Other features, e.g. …',
      featureRequests: 'e.g. speaking scoring, AI chat practice, hanzi games…',
      contact: 'e.g. david@example.com',
    },
    errRequired: 'Please complete all required questions (marked with *)',
    submitting: 'Submitting…',
    successTitle: 'Thank you for your feedback! 🎉',
    successDesc: '200 credits added. Keep learning!',
    alreadyClaimed: 'Answers saved. You already claimed the survey reward before — no extra credits this time.',
    failDesc: 'Answers saved, but the reward failed to grant. Please retry in My Center.',
    goProfile: 'My Center',
    goHome: 'Back Home',
    retry: 'Retry',
    requiredMark: 'Required',
  },
} as const

type DT = typeof D.zh
/** 只取字符串值的 key（排除 placeholders 对象），用于选项标签查找 */
type StringKeyOf<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T]

const FEATURE_LABELS: Record<string, StringKeyOf<DT>> = {
  flashcard: 'fFlashcard', drag: 'fDrag', type: 'fType', dict: 'fDict',
  stroke: 'fStroke', wrongbook: 'fWrong', other: 'fOther',
}
const TB_LABELS: Record<string, StringKeyOf<DT>> = {
  hanyu_jiaocheng: 'tbJiaocheng', hsk_std: 'tbHskStd', xin_shiyong: 'tbXinShiyong',
  fazhan_hanyu: 'tbFazhan', other: 'tbOther',
}
const NEEDS_LABELS: Record<string, StringKeyOf<DT>> = {
  comprehensive: 'nbComprehensive', oral: 'nbOral', business: 'nbBusiness',
  hsk_special: 'nbHsk', children: 'nbChildren', exam: 'nbExam', tcm_travel: 'nbTcmTravel',
}

type Answer = {
  satisfaction: number | null
  features: string[]
  features_other: string
  hsk_rating: number | null
  hsk_issue: string
  favorite_feature: string | null
  level: string | null
  textbook: string[]
  textbook_other: string
  textbook_needs: string[]
  textbook_other_needs: string
  improvements: string
  nps: number | null
  daily_hook: string | null
  feature_requests: string
  contact: string
}

const EMPTY: Answer = {
  satisfaction: null, features: [], features_other: '', hsk_rating: null, hsk_issue: '',
  favorite_feature: null, level: null, textbook: [], textbook_other: '', textbook_needs: [],
  textbook_other_needs: '', improvements: '', nps: null, daily_hook: null, feature_requests: '', contact: '',
}

const FEATURE_KEYS = ['flashcard', 'drag', 'type', 'dict', 'stroke', 'wrongbook', 'other'] as const
const TB_KEYS = ['hanyu_jiaocheng', 'hsk_std', 'xin_shiyong', 'fazhan_hanyu', 'other'] as const
const NEEDS_KEYS = ['comprehensive', 'oral', 'business', 'hsk_special', 'children', 'exam', 'tcm_travel'] as const

// ⚠️ 必须放在组件外部（模块级）：若定义在组件内部，每次渲染都会生成新的组件类型，
//    导致整个题目区块（含输入框）被卸载重挂载，输入框立刻失焦、中文输入法打字即断。
function QWrap({ n, title, titleEn, required, children }: {
  n: number; title: string; titleEn: string; required?: boolean; children: ReactNode
}) {
  const { lang } = useLang()
  const tt = D[lang]
  return (
    <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
      <div className="flex gap-3 items-start">
        <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-800">
            {title}
            {required && <span className="ml-1.5 text-[10px] font-semibold text-red-400 align-middle px-1.5 py-0.5 rounded bg-red-50">{tt.requiredMark}</span>}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{titleEn}</div>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </section>
  )
}

/** 把常见的数据库未初始化错误翻译成用户看得懂的话 */
function friendlyError(msg: string, lang: Lang): string {
  if (/does not exist|Could not find|undefined_table|42P01|PGRST205|PGRST202/i.test(msg)) {
    return lang === 'zh'
      ? '数据库还没初始化：请先在 Supabase 后台执行 credits.sql 脚本，再回来提交。'
      : 'Database not initialized: please run the credits.sql script in Supabase first.'
  }
  return msg
}

export function SurveyPage({ session, lang = 'zh', onDone, onClose }: {
  session: Session
  lang?: Lang
  onDone: () => void
  onClose: () => void
}) {
  const tt = D[lang]
  const [a, setA] = useState<Answer>(EMPTY)
  const [step, setStep] = useState(0) // 0=未开始 1=答题 2=成功 3=已领过 4=发分失败
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  const set = <K extends keyof Answer>(k: K, v: Answer[K]) => setA(prev => ({ ...prev, [k]: v }))
  const toggle = (k: 'features' | 'textbook' | 'textbook_needs', key: string) => {
    setA(prev => {
      const cur = prev[k] as string[]
      const next = cur.includes(key) ? cur.filter(x => x !== key) : [...cur, key]
      return { ...prev, [k]: next }
    })
  }

  const validate = (): boolean => {
    if (a.satisfaction == null) return false
    if (a.features.length === 0) return false
    if (a.hsk_rating == null) return false
    if (!a.favorite_feature) return false
    if (!a.level) return false
    if (a.textbook.length === 0) return false
    if (a.textbook_needs.length === 0) return false
    if (a.nps == null) return false
    if (!a.daily_hook) return false
    return true
  }

  const submit = async () => {
    if (!validate()) { setErr(tt.errRequired); return }
    setErr('')
    setSubmitting(true)
    try {
      const answers = { ...a }
      const { error } = await supabase.from('survey_responses').insert({
        user_id: session.user.id,
        answers: answers as unknown as never,
      })
      if (error) { setErr(friendlyError(error.message, lang)); setSubmitting(false); return }
      try {
        const ok = await grantSurveyCredits()
        setStep(ok ? 2 : 3)
      } catch {
        setStep(4)
      }
    } catch (e) {
      setErr(e instanceof Error ? friendlyError(e.message, lang) : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  // ── 成功 / 已领过 / 失败 页面 ──
  if (step >= 2) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-slate-200/60">
          <div className="text-5xl mb-4">{step === 2 ? '🎉' : step === 3 ? '📝' : '⚠️'}</div>
          <h3 className="text-xl font-bold text-slate-800">{step === 2 ? tt.successTitle : tt.alreadyClaimed}</h3>
          {step === 2 && <p className="text-sm text-emerald-600 font-semibold mt-2">+{CREDIT.SURVEY} 🪙</p>}
          {step === 4 && <p className="text-sm text-amber-600 mt-2">{tt.failDesc}</p>}
          <div className="flex flex-col gap-2 mt-6">
            <button onClick={onDone} className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold hover:opacity-95 transition-all">
              {tt.goProfile}
            </button>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-all">
              {tt.goHome}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 欢迎页 ──
  if (step === 0) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-slate-200/60">
          <div className="text-5xl mb-3">📋</div>
          <h2 className="text-2xl font-bold text-slate-800">{tt.title}</h2>
          <p className="text-sm text-slate-500 mt-2">{tt.subtitle}</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold">
            🪙 {tt.reward}
          </div>
          <p className="text-xs text-slate-400 mt-3">{tt.exitHint}</p>
          <button onClick={() => { setStep(1); setErr('') }}
            className="mt-6 w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-base font-bold hover:opacity-95 transition-all">
            {lang === 'zh' ? '开始答题 →' : 'Start →'}
          </button>
        </div>
      </div>
    )
  }

  // ── 答题页 ──
  const chip = (active: boolean) =>
    `px-3.5 py-2 rounded-xl border text-sm font-medium transition-all ${
      active
        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/40'
    }`

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10">
      {/* 头部 */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">📋 {tt.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{tt.progress} · {lang === 'zh' ? '12 题' : '12 questions'}</p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold whitespace-nowrap">
          🪙 {tt.reward}
        </div>
      </div>

      {err && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          ⚠️ {err}
        </p>
      )}

      {/* Q1 满意度 */}
      <QWrap n={1} title={tt.q1} titleEn={tt.q1En} required>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(v => (
            <button key={v} onClick={() => set('satisfaction', v)}
              className={`text-3xl transition-transform hover:scale-110 ${a.satisfaction !== null && v <= a.satisfaction ? '' : 'grayscale opacity-40'}`}
              aria-label={`${v} star`}>{v <= (a.satisfaction ?? 0) ? '★' : '☆'}</button>
          ))}
        </div>
      </QWrap>

      {/* Q2 常用功能 */}
      <QWrap n={2} title={tt.q2} titleEn={tt.q2En} required>
        <div className="flex flex-wrap gap-2">
          {FEATURE_KEYS.map(k => (
            <button key={k} onClick={() => toggle('features', k)} className={chip(a.features.includes(k))}>
              {tt[FEATURE_LABELS[k]]}
            </button>
          ))}
        </div>
        {a.features.includes('other') && (
          <input type="text" value={a.features_other} onChange={e => set('features_other', e.target.value)}
            placeholder={tt.placeholders.featuresOther} className="mt-2.5 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:outline-none" />
        )}
      </QWrap>

      {/* Q3 HSK 背单词好用度 */}
      <QWrap n={3} title={tt.q3} titleEn={tt.q3En} required>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map(v => (
            <button key={v} onClick={() => set('hsk_rating', v)} className={chip(a.hsk_rating === v)}>
              {v === 1 && (lang === 'zh' ? '1 很难用' : '1 Hard')}
              {v === 2 && '2'}{v === 3 && '3'}{v === 4 && '4'}
              {v === 5 && (lang === 'zh' ? '5 很好用' : '5 Great')}
            </button>
          ))}
        </div>
        <input type="text" value={a.hsk_issue} onChange={e => set('hsk_issue', e.target.value)}
          placeholder={tt.placeholders.hskIssue} className="mt-2.5 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:outline-none" />
      </QWrap>

      {/* Q4 帮助最大的模式 */}
      <QWrap n={4} title={tt.q4} titleEn={tt.q4En} required>
        <div className="flex flex-wrap gap-2">
          {FEATURE_KEYS.slice(0, 6).map(k => (
            <button key={k} onClick={() => set('favorite_feature', k)} className={chip(a.favorite_feature === k)}>
              {tt[FEATURE_LABELS[k]]}
            </button>
          ))}
        </div>
      </QWrap>

      {/* Q5 汉语水平 */}
      <QWrap n={5} title={tt.q5} titleEn={tt.q5En} required>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => set('level', 'zero')} className={chip(a.level === 'zero')}>{tt.levelZero}</button>
          {[1, 2, 3, 4, 5, 6].map(v => (
            <button key={v} onClick={() => set('level', `hsk${v}`)} className={chip(a.level === `hsk${v}`)}>HSK {v}</button>
          ))}
          <button onClick={() => set('level', 'not_sure')} className={chip(a.level === 'not_sure')}>{tt.levelNotSure}</button>
        </div>
      </QWrap>

      {/* Q6 所用教材 */}
      <QWrap n={6} title={tt.q6} titleEn={tt.q6En} required>
        <div className="flex flex-wrap gap-2">
          {TB_KEYS.slice(0, 4).map(k => (
            <button key={k} onClick={() => toggle('textbook', k)} className={chip(a.textbook.includes(k))}>
              {tt[TB_LABELS[k]]}
            </button>
          ))}
          <button onClick={() => toggle('textbook', 'other')} className={chip(a.textbook.includes('other'))}>{tt.tbOther}</button>
        </div>
        {a.textbook.includes('other') && (
          <input type="text" value={a.textbook_other} onChange={e => set('textbook_other', e.target.value)}
            placeholder={tt.placeholders.tbOther} className="mt-2.5 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:outline-none" />
        )}
      </QWrap>

      {/* Q7 希望新增教材 */}
      <QWrap n={7} title={tt.q7} titleEn={tt.q7En} required>
        <div className="flex flex-wrap gap-2">
          {NEEDS_KEYS.map(k => (
            <button key={k} onClick={() => toggle('textbook_needs', k)} className={chip(a.textbook_needs.includes(k))}>
              {tt[NEEDS_LABELS[k]]}
            </button>
          ))}
        </div>
        <input type="text" value={a.textbook_other_needs} onChange={e => set('textbook_other_needs', e.target.value)}
          placeholder={tt.placeholders.tbNeeds} className="mt-2.5 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:outline-none" />
      </QWrap>

      {/* Q8 bug */}
      <QWrap n={8} title={tt.q8} titleEn={tt.q8En}>
        <textarea rows={2} value={a.improvements} onChange={e => set('improvements', e.target.value)}
          placeholder={tt.placeholders.improvements} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:outline-none resize-y" />
      </QWrap>

      {/* Q9 NPS */}
      <QWrap n={9} title={tt.q9} titleEn={tt.q9En} required>
        <div className="flex gap-1.5 flex-wrap">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
            <button key={v} onClick={() => set('nps', v)}
              className={`w-9 h-9 rounded-full text-xs font-bold border transition-all ${
                a.nps === v ? 'bg-indigo-500 text-white border-indigo-500 shadow' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}>{v}</button>
          ))}
        </div>
      </QWrap>

      {/* Q10 每日登录 */}
      <QWrap n={10} title={tt.q10} titleEn={tt.q10En} required>
        <div className="flex flex-wrap gap-2">
          {(['yes_everyday', 'yes_sometimes', 'none'] as const).map(k => (
            <button key={k} onClick={() => set('daily_hook', k)} className={chip(a.daily_hook === k)}>
              {k === 'yes_everyday' ? tt.dailyEveryday : k === 'yes_sometimes' ? tt.dailySometimes : tt.dailyNone}
            </button>
          ))}
        </div>
      </QWrap>

      {/* Q11 新功能建议 */}
      <QWrap n={11} title={tt.q11} titleEn={tt.q11En}>
        <input type="text" value={a.feature_requests} onChange={e => set('feature_requests', e.target.value)}
          placeholder={tt.placeholders.featureRequests} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:outline-none" />
      </QWrap>

      {/* Q12 联系方式 */}
      <QWrap n={12} title={tt.q12} titleEn={tt.q12En}>
        <input type="text" value={a.contact} onChange={e => set('contact', e.target.value)}
          placeholder={tt.placeholders.contact} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:outline-none" />
      </QWrap>

      {/* 提交 */}
      {err && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          ⚠️ {err}
        </p>
      )}
      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-xs text-slate-400">{tt.submitNote}</p>
        <button type="button" onClick={submit} disabled={submitting}
          className="px-8 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-sm font-bold hover:opacity-95 transition-all disabled:opacity-50">
          {submitting ? tt.submitting : tt.submit}
        </button>
      </div>
    </div>
  )
}
