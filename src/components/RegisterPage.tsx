import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useLang } from '@/i18n/useLang'

const D = {
  zh: {
    title: '注册 / 登录 趣学汉语',
    subtitle: '注册即可保存学习进度，并加入会员版内测名单',
    name: '姓名（选填）',
    phone: '手机号',
    cc: '区号',
    otherCc: '国家区号（如 +998）',
    email: '邮箱',
    password: '密码（至少 6 位）',
    wantsPaid: '会员版内测时优先通知我',
    agreed: '我已阅读并同意《用户协议》和《隐私政策》',
    registerBtn: '立即注册',
    loginBtn: '直接登录',
    toLogin: '已有账号？去登录',
    toRegister: '还没有账号？去注册',
    success: '注册成功！你已加入名单，会员版内测时我们会优先通知你。',
    loginSuccess: '登录成功，欢迎回来！',
    checkEmail: '注册成功！请查收确认邮件后登录。',
    logout: '退出登录',
    loggedInAs: '当前登录：',
    backHome: '返回首页继续学习',
    brandSub: 'Fun Chinese · 游戏化汉语学习',
    heroLine1: '让每一个汉字',
    heroLine2: '都记得住',
    heroSub: '翻转词卡 · 拖拽拼句 · 听力听写 · 笔顺动画 · 游戏激励',
    tabReg: '注册账号',
    tabLogin: '直接登录',
    backLink: '返回首页',
    copyright: '© 2026 趣学汉语 · 让汉语学习更有趣',
  },
  en: {
    title: 'Sign up / Log in to QuXue Chinese',
    subtitle: 'Save your progress and join the VIP beta list',
    name: 'Name (optional)',
    phone: 'Phone number',
    cc: 'Code',
    otherCc: 'Country code (e.g. +998)',
    email: 'Email',
    password: 'Password (min 6 chars)',
    wantsPaid: 'Notify me first when VIP beta opens',
    agreed: 'I have read and agree to the Terms and Privacy Policy',
    registerBtn: 'Sign up now',
    loginBtn: 'Log in',
    toLogin: 'Already have an account? Log in',
    toRegister: "No account? Sign up",
    success: 'Signed up! You are on the list — we will notify you first when VIP beta opens.',
    loginSuccess: 'Logged in. Welcome back!',
    checkEmail: 'Signed up! Please check your email to confirm, then log in.',
    logout: 'Log out',
    loggedInAs: 'Logged in as: ',
    backHome: 'Back to learning',
    brandSub: 'Fun Chinese · Gamified Chinese learning',
    heroLine1: 'Make every Chinese',
    heroLine2: 'character stick',
    heroSub: 'Flip cards · Drag sentences · Listen & type · Stroke order · Gamified',
    tabReg: 'Sign up',
    tabLogin: 'Log in',
    backLink: 'Back home',
    copyright: '© 2026 QuXue Chinese · Make learning fun',
  },
} as const

// 左侧功能轮播文案（5 张）
const FEATURES = {
  zh: ['音形义一体记忆', '动手拼句学语法', '听说写全面提升', '逐笔动画写对汉字', '经验等级越学越上瘾'],
  en: ['sound-shape-meaning', 'build sentences by play', 'listen & type fluency', 'write strokes correctly', 'XP & levels hook you'],
}

// 国际区号（含主要汉语学习者来源国）
const COUNTRIES: { code: string; label: string }[] = [
  { code: '+86', label: '🇨🇳 +86 中国' },
  { code: '+1', label: '🇺🇸 +1 美国/加拿大' },
  { code: '+7', label: '🇷🇺 +7 俄罗斯' },
  { code: '+44', label: '🇬🇧 +44 英国' },
  { code: '+61', label: '🇦🇺 +61 澳大利亚' },
  { code: '+81', label: '🇯🇵 +81 日本' },
  { code: '+82', label: '🇰🇷 +82 韩国' },
  { code: '+33', label: '🇫🇷 +33 法国' },
  { code: '+49', label: '🇩🇪 +49 德国' },
  { code: '+39', label: '🇮🇹 +39 意大利' },
  { code: '+34', label: '🇪🇸 +34 西班牙' },
  { code: '+55', label: '🇧🇷 +55 巴西' },
  { code: '+91', label: '🇮🇳 +91 印度' },
  { code: '+65', label: '🇸🇬 +65 新加坡' },
  { code: '+84', label: '🇻🇳 +84 越南' },
  { code: '+62', label: '🇮🇩 +62 印尼' },
  { code: '+63', label: '🇵🇭 +63 菲律宾' },
  { code: '+66', label: '🇹🇭 +66 泰国' },
  { code: '+60', label: '🇲🇾 +60 马来西亚' },
  { code: '+64', label: '🇳🇿 +64 新西兰' },
  { code: '+90', label: '🇹🇷 +90 土耳其' },
  { code: '+98', label: '🇮🇷 +98 伊朗' },
  { code: '+92', label: '🇵🇰 +92 巴基斯坦' },
  { code: '+880', label: '🇧🇩 +880 孟加拉' },
  { code: '+977', label: '🇳🇵 +977 尼泊尔' },
  { code: '+855', label: '🇰🇭 +855 柬埔寨' },
  { code: '+856', label: '🇱🇦 +856 老挝' },
  { code: '+94', label: '🇱🇰 +94 斯里兰卡' },
  { code: '+971', label: '🇦🇪 +971 阿联酋' },
  { code: '+966', label: '🇸🇦 +966 沙特' },
  { code: '+27', label: '🇿🇦 +27 南非' },
  { code: '+234', label: '🇳🇬 +234 尼日利亚' },
  { code: '+254', label: '🇰🇪 +254 肯尼亚' },
  { code: '+20', label: '🇪🇬 +20 埃及' },
  { code: '+380', label: '🇺🇦 +380 乌克兰' },
  { code: '+375', label: '🇧🇾 +375 白俄罗斯' },
  { code: '+996', label: '🇰🇬 +996 吉尔吉斯' },
  // ── 常见遗漏补充 ──
  { code: '+976', label: '🇲🇳 +976 蒙古' },
  { code: '+998', label: '🇺🇿 +998 乌兹别克斯坦' },
  { code: '+52', label: '🇲🇽 +52 墨西哥' },
  { code: '+54', label: '🇦🇷 +54 阿根廷' },
  { code: '+56', label: '🇨🇱 +56 智利' },
  { code: '+57', label: '🇨🇴 +57 哥伦比亚' },
  { code: '+48', label: '🇵🇱 +48 波兰' },
  { code: '+31', label: '🇳🇱 +31 荷兰' },
  { code: '+43', label: '🇦🇹 +43 奥地利' },
  { code: '+41', label: '🇨🇭 +41 瑞士' },
  { code: '+46', label: '🇸🇪 +46 瑞典' },
  { code: '+32', label: '🇧🇪 +32 比利时' },
  { code: '+351', label: '🇵🇹 +351 葡萄牙' },
  { code: '+972', label: '🇮🇱 +972 以色列' },
  { code: '+974', label: '🇶🇦 +974 卡塔尔' },
  { code: '+370', label: '🇱🇹 +370 立陶宛' },
  { code: '+372', label: '🇪🇪 +372 爱沙尼亚' },
  { code: '+994', label: '🇦🇿 +994 阿塞拜疆' },
  { code: '+995', label: '🇬🇪 +995 格鲁吉亚' },
  { code: '+852', label: '🇭🇰 +852 中国香港' },
  { code: '+853', label: '🇲🇴 +853 中国澳门' },
  { code: '+886', label: '🇨🇳 +886 中国台湾' },
  { code: '__other__', label: '🌐 其他 / Other' },
]

// 轮播关键帧（组件内联，避免改动全局样式）
const KEYFRAMES = `
@keyframes qxFlip { 0%,42%{transform:rotateY(0)} 50%,92%{transform:rotateY(180deg)} 100%{transform:rotateY(360deg)} }
@keyframes qxChipIn { from{opacity:0;transform:translateY(22px) scale(.9)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes qxTypeReveal { 0%{clip-path:inset(0 100% 0 0)} 55%,100%{clip-path:inset(0 0 0 0)} }
@keyframes qxCaretBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
@keyframes qxFlame { 0%,100%{transform:scale(1)} 50%{transform:scale(1.25)} }
@keyframes qxFloatUp { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes qxBarFill { 0%{width:0} 60%,100%{width:72%} }
.qxFlashcard{transform-style:preserve-3d;animation:qxFlip 5s infinite ease-in-out}
.qxFcFace{backface-visibility:hidden;-webkit-backface-visibility:hidden}
.qxFcBack{transform:rotateY(180deg)}
.qxChip{animation:qxChipIn .5s both}
.qxT1{animation-delay:.2s}.qxT2{animation-delay:.7s}.qxT3{animation-delay:1.2s}.qxT4{animation-delay:1.7s}
.qxType{animation:qxTypeReveal 4s infinite steps(24,end)}
.qxCaret{animation:qxCaretBlink 1s infinite}
.qxFlame{animation:qxFlame 1.1s infinite}
.qxFloaty{animation:qxFloatUp 3.5s infinite ease-in-out}
.qxXpbar>span{display:block;height:100%;background:linear-gradient(90deg,#6366f1,#3b82f6);border-radius:99px;animation:qxBarFill 4s infinite}
`

export default function RegisterPage({ onGoHome }: { onGoHome: () => void }) {
  const { lang } = useLang()
  const tt = D[lang]
  const feat = FEATURES[lang]

  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [fullName, setFullName] = useState('')
  const [cc, setCc] = useState('+86')
  const [customCc, setCustomCc] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [wantsPaid, setWantsPaid] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [msg, setMsg] = useState('')
  const [user, setUser] = useState<{ email: string | null } | null>(null)

  // 左侧功能轮播
  const [slide, setSlide] = useState(0)
  const SLIDES = 5
  useEffect(() => {
    if (user) return
    const id = setInterval(() => setSlide((s) => (s + 1) % SLIDES), 4000)
    return () => clearInterval(id)
  }, [user])

  // 进入页面时恢复已登录会话
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUser({ email: data.session.user.email ?? null })
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    if (mode === 'register' && !agreed) {
      setStatus('err'); setMsg(lang === 'zh' ? '请先阅读并同意用户协议和隐私政策' : 'Please read and agree to the Terms and Privacy Policy'); return
    }
    if (mode === 'register') {
      const effectiveCc = cc === '__other__' ? customCc.trim() : cc
      const phoneVal = `${effectiveCc ? effectiveCc + ' ' : ''}${phone}`.trim()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, phone: phoneVal, wants_paid: wantsPaid } },
      })
      if (error) { setStatus('err'); setMsg(error.message); return }
      if (data.session) {
        setStatus('ok'); setMsg(tt.success); setUser({ email: data.user?.email ?? email })
      } else {
        setStatus('ok'); setMsg(tt.checkEmail)
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setStatus('err'); setMsg(error.message); return }
      setStatus('ok'); setMsg(tt.loginSuccess); setUser({ email: data.user?.email ?? email })
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null); setStatus('idle'); setMsg('')
  }

  // ── 已登录：紧凑卡片 ──
  if (user) {
    return (
      <div className="max-w-md mx-auto mt-6 sm:mt-10">
        <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-slate-100">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-sm font-medium">
              ✅ {tt.loggedInAs}{user.email}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={onGoHome}
                className="w-full py-3 rounded-full bg-gradient-to-r from-[#6366f1] to-[#3b82f6] text-white text-base font-bold hover:-translate-y-0.5 transition-all shadow-[0_4px_20px_rgba(99,102,241,0.35)]">
                {tt.backHome}
              </button>
              <button onClick={handleLogout}
                className="w-full py-2.5 rounded-full bg-white text-slate-500 text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-all">
                {tt.logout}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 未登录：双栏品牌登录页 ──
  return (
    <div className="min-h-screen lg:flex font-sans bg-[#eff6ff]">
      <style>{KEYFRAMES}</style>

      {/* ===== 左侧：品牌 + 功能动图 ===== */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#6366f1] via-[#4f46e5] to-[#3b82f6] px-8 lg:px-14 py-10 flex-col justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-icon.jpg" className="w-10 h-10 rounded-xl shadow" alt="logo" />
          <div>
            <div className="text-2xl font-extrabold text-white leading-none">趣学汉语</div>
            <div className="text-xs text-indigo-100 mt-0.5">{tt.brandSub}</div>
          </div>
        </div>

        <div className="my-6">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight">
            {tt.heroLine1}<br />都<span className="text-indigo-200">{tt.heroLine2}</span>
          </h1>
          <p className="text-indigo-100 mt-3 text-sm">{tt.heroSub}</p>
        </div>

        <div className="relative flex-1 flex items-center">
          <div className="w-full">
            {/* 幻灯片 1：翻转词卡 */}
            <div className={slide === 0 ? 'block' : 'hidden'}>
              <div className="mx-auto w-[260px] h-[300px] bg-white rounded-3xl shadow-xl p-5 flex flex-col qxFloaty">
                <div className="text-xs font-bold text-[#6366f1] mb-1">🎯 词卡背词</div>
                <div className="flex-1" style={{ perspective: '1000px' }}>
                  <div className="qxFlashcard relative w-full h-full">
                    <div className="qxFcFace absolute inset-0 rounded-2xl bg-gradient-to-br from-[#eff6ff] to-[#e0e7ff] flex flex-col items-center justify-center text-center">
                      <div className="text-6xl font-bold text-[#1e1b4b]">你好</div>
                      <div className="text-lg text-[#4f46e5] mt-2">nǐ hǎo</div>
                      <div className="mt-4 px-3 py-1.5 rounded-full bg-white/80 text-[#4f46e5] text-sm shadow">🔊 听发音</div>
                      <div className="text-[11px] text-[#64748b] mt-3">点击卡片看释义</div>
                    </div>
                    <div className="qxFcFace qxFcBack absolute inset-0 rounded-2xl bg-white border border-[#c7d2fe] flex flex-col items-center justify-center text-center p-4">
                      <div className="text-4xl font-bold text-[#1e1b4b]">你好</div>
                      <div className="text-base text-[#475569] mt-2">hello / hi</div>
                      <div className="text-xs text-[#64748b] mt-3 leading-relaxed">例句：你好，我叫大卫。<br />Hello, I'm David.</div>
                      <div className="mt-3 text-[11px] px-2 py-0.5 rounded bg-[#eff6ff] text-[#4f46e5]">HSK 1</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center text-sm text-indigo-100 mt-4">{feat[0]}</div>
            </div>

            {/* 幻灯片 2：拖拽拼句 */}
            <div className={slide === 1 ? 'block' : 'hidden'}>
              <div className="mx-auto w-[300px] bg-white rounded-3xl shadow-xl p-5 qxFloaty">
                <div className="text-xs font-bold text-[#6366f1] mb-3">✍️ 拖拽拼句</div>
                <div className="bg-[#eff6ff] rounded-2xl p-3 min-h-[64px] flex items-center gap-2 flex-wrap border-2 border-dashed border-[#c7d2fe]">
                  <span className="qxChip qxT1 px-3 py-1.5 rounded-lg bg-[#6366f1] text-white text-sm font-semibold shadow">我</span>
                  <span className="qxChip qxT2 px-3 py-1.5 rounded-lg bg-[#4f46e5] text-white text-sm font-semibold shadow">每天</span>
                  <span className="qxChip qxT3 px-3 py-1.5 rounded-lg bg-[#3b82f6] text-white text-sm font-semibold shadow">吃</span>
                  <span className="qxChip qxT4 px-3 py-1.5 rounded-lg bg-[#2563eb] text-white text-sm font-semibold shadow">苹果</span>
                </div>
                <div className="mt-3 text-[11px] text-[#64748b]">把打乱的词语拖成正确句子 →</div>
              </div>
              <div className="text-center text-sm text-indigo-100 mt-4">{feat[1]}</div>
            </div>

            {/* 幻灯片 3：看英打中 / 听力听写 */}
            <div className={slide === 2 ? 'block' : 'hidden'}>
              <div className="mx-auto w-[300px] bg-white rounded-3xl shadow-xl p-5 qxFloaty">
                <div className="text-xs font-bold text-[#6366f1] mb-3">🎧 看英打中 / 听力听写</div>
                <div className="bg-[#eff6ff] rounded-2xl p-4 text-center">
                  <div className="text-sm text-[#64748b]">English:</div>
                  <div className="text-base font-semibold text-[#1e1b4b] mb-3">I like learning Chinese.</div>
                  <div className="flex items-center justify-center gap-1 text-2xl font-bold text-[#4f46e5] h-9">
                    <span className="qxType">我喜欢学习汉语</span><span className="qxCaret text-[#6366f1]">|</span>
                  </div>
                </div>
                <div className="mt-3 flex justify-center gap-2 text-[11px] text-[#64748b]">
                  <span className="px-2 py-0.5 rounded bg-[#eff6ff]">🔊 听写</span>
                  <span className="px-2 py-0.5 rounded bg-[#eff6ff]">⌨️ 打字</span>
                </div>
              </div>
              <div className="text-center text-sm text-indigo-100 mt-4">{feat[2]}</div>
            </div>

            {/* 幻灯片 4：汉字笔顺 */}
            <div className={slide === 3 ? 'block' : 'hidden'}>
              <div className="mx-auto w-[260px] h-[300px] bg-white rounded-3xl shadow-xl p-5 flex flex-col items-center qxFloaty">
                <div className="text-xs font-bold text-[#6366f1] mb-2 self-start">🖌️ 汉字笔顺</div>
                <img src="/han-stroke-order.gif" alt="汉 笔画动图" className="w-40 h-40 rounded-xl object-contain bg-[#f8fafc] border border-[#e2e8f0]" />
                <div className="mt-2 text-[#475569] text-sm">汉 · hàn (Chinese)</div>
                <div className="mt-1 text-[11px] text-[#64748b]">逐笔动画 · 学会正确书写</div>
              </div>
              <div className="text-center text-sm text-indigo-100 mt-4">{feat[3]}</div>
            </div>

            {/* 幻灯片 5：游戏化激励 */}
            <div className={slide === 4 ? 'block' : 'hidden'}>
              <div className="mx-auto w-[300px] bg-white rounded-3xl shadow-xl p-5 qxFloaty">
                <div className="text-xs font-bold text-[#6366f1] mb-3">🔥 游戏化激励</div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-center">
                    <div className="text-3xl qxFlame">🔥</div>
                    <div className="text-xs text-[#64748b] mt-1">连胜 3 天</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-extrabold text-[#4f46e5]">120</div>
                    <div className="text-xs text-[#64748b]">经验值 XP</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-extrabold text-[#6366f1]">Lv.2</div>
                    <div className="text-xs text-[#64748b]">等级</div>
                  </div>
                </div>
                <div className="qxXpbar h-3 rounded-full bg-[#e0e7ff] overflow-hidden"><span></span></div>
                <div className="mt-3 text-[11px] text-[#64748b] text-center">答对 +10 XP · 升级解锁更多</div>
              </div>
              <div className="text-center text-sm text-indigo-100 mt-4">{feat[4]}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: SLIDES }).map((_, i) => (
            <button key={i} onClick={() => setSlide(i)}
              className={`w-2.5 h-2.5 rounded-full transition ${i === slide ? 'bg-white' : 'bg-white/40'}`} />
          ))}
        </div>
      </div>

      {/* ===== 右侧：注册 / 登录表单 ===== */}
      <div className="lg:w-1/2 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 lg:hidden">
            <div className="text-2xl font-extrabold text-[#4f46e5]">趣学汉语</div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 border border-[#e0e7ff]">
            <div className="flex mb-6 bg-[#eff6ff] rounded-xl p-1">
              <button type="button" onClick={() => { setMode('register'); setMsg(''); setStatus('idle') }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${mode === 'register' ? 'bg-white text-[#4f46e5] shadow' : 'text-[#64748b]'}`}>
                {tt.tabReg}
              </button>
              <button type="button" onClick={() => { setMode('login'); setMsg(''); setStatus('idle') }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${mode === 'login' ? 'bg-white text-[#4f46e5] shadow' : 'text-[#64748b]'}`}>
                {tt.tabLogin}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <input
                  className="w-full px-4 py-3 rounded-xl border border-[#c7d2fe] text-base bg-[#f8fafc] focus:bg-white focus:border-[#6366f1] focus:outline-none transition-colors"
                  type="text" placeholder={tt.name} value={fullName}
                  onChange={(e) => setFullName(e.target.value)} />
              )}
              <input
                className="w-full px-4 py-3 rounded-xl border border-[#c7d2fe] text-base bg-[#f8fafc] focus:bg-white focus:border-[#6366f1] focus:outline-none transition-colors"
                type="email" required placeholder={tt.email} value={email}
                onChange={(e) => setEmail(e.target.value)} />

              {mode === 'register' && (
                <div className="flex items-center rounded-xl border border-[#c7d2fe] bg-[#f8fafc] focus-within:bg-white focus-within:border-[#6366f1] overflow-hidden transition-colors">
                  <select
                    aria-label={tt.cc}
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    className="shrink-0 px-3 py-3 text-base bg-transparent focus:outline-none border-0 outline-none text-[#475569]">
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    className="flex-1 min-w-0 px-2 py-3 text-base bg-transparent focus:outline-none"
                    type="tel" required pattern="[0-9\s]{5,15}" placeholder={tt.phone} value={phone}
                    onChange={(e) => setPhone(e.target.value)} />
                </div>
              )}
              {mode === 'register' && cc === '__other__' && (
                <input
                  className="w-full px-4 py-3 rounded-xl border border-[#c7d2fe] text-base bg-[#f8fafc] focus:bg-white focus:border-[#6366f1] focus:outline-none transition-colors"
                  type="text" required placeholder={tt.otherCc} value={customCc}
                  onChange={(e) => setCustomCc(e.target.value)} />
              )}

              <input
                className="w-full px-4 py-3 rounded-xl border border-[#c7d2fe] text-base bg-[#f8fafc] focus:bg-white focus:border-[#6366f1] focus:outline-none transition-colors"
                type="password" required minLength={6} placeholder={tt.password} value={password}
                onChange={(e) => setPassword(e.target.value)} />

              {mode === 'register' && (
                <>
                  <label className="flex items-center gap-2.5 text-slate-600 text-sm cursor-pointer select-none">
                    <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={wantsPaid}
                      onChange={(e) => setWantsPaid(e.target.checked)} />
                    {tt.wantsPaid}
                  </label>
                  <label className="flex items-center gap-2.5 text-slate-500 text-xs cursor-pointer select-none">
                    <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)} />
                    {tt.agreed}
                  </label>
                </>
              )}

              <button
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#3b82f6] text-white text-lg font-bold hover:opacity-95 transition shadow-lg disabled:opacity-60"
                disabled={status === 'loading'}>
                {status === 'loading'
                  ? '…'
                  : mode === 'register' ? tt.registerBtn : tt.loginBtn}
              </button>

              {msg && (
                <p className={`text-center text-sm ${status === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>
              )}

              <button type="button" onClick={() => { setMode(m => m === 'register' ? 'login' : 'register'); setMsg(''); setStatus('idle') }}
                className="w-full text-center text-sm text-[#4f46e5] hover:text-[#4338ca] font-medium">
                {mode === 'register' ? tt.toLogin : tt.toRegister}
              </button>
            </form>

            <p className="text-center text-xs text-[#64748b] mt-5">{tt.copyright}</p>
          </div>

          <div className="text-center mt-4 text-xs text-[#64748b]">
            <button type="button" onClick={onGoHome} className="hover:text-[#4f46e5]">{tt.backLink}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
