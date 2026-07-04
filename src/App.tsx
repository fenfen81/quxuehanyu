import { useState, useEffect } from 'react'
import { categories } from '@/data/content'
import { usePracticeStore } from '@/hooks/usePracticeStore'
import { CategoryGrid } from '@/components/CategoryGrid'
import { TextbookList } from '@/components/TextbookList'
import { PracticePage } from '@/components/PracticePage'
import WordCardPage from '@/components/WordCardPage'
import type { CategorySlug } from '@/types'
import type { HskWord } from '@/data/hskWords'
import { useLang } from '@/i18n/useLang'
import { t } from '@/i18n/translations'

type Page = 'home' | 'category' | 'practice' | 'words'

export function App() {
  const [page, setPage] = useState<Page>('home')
  const [selectedCategory, setSelectedCategory] = useState<CategorySlug | null>(null)
  const { setTextbook } = usePracticeStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [wrongWords, setWrongWords] = useState<HskWord[]>(() => {
    try { return JSON.parse(localStorage.getItem('quxue-wrong-words') || '[]') }
    catch { return [] }
  })
  const { lang, toggle } = useLang()
  const tt = (k: Parameters<typeof t>[0]) => t(k, lang)

  // ── 游戏化状态 ──
  const [xp, setXp] = useState(() => {
    const saved = localStorage.getItem('juyou-xp')
    return saved ? parseInt(saved) : 0
  })
  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem('juyou-streak')
    return saved ? parseInt(saved) : 0
  })
  const [totalDone, setTotalDone] = useState(() => {
    const saved = localStorage.getItem('juyou-done')
    return saved ? parseInt(saved) : 0
  })

  // 持久化
  useEffect(() => { localStorage.setItem('juyou-xp', String(xp)) }, [xp])
  useEffect(() => { localStorage.setItem('juyou-streak', String(streak)) }, [streak])
  useEffect(() => { localStorage.setItem('juyou-done', String(totalDone)) }, [totalDone])
  useEffect(() => { localStorage.setItem('quxue-wrong-words', JSON.stringify(wrongWords)) }, [wrongWords])

  const level = Math.floor(xp / 100) + 1
  const xpInLevel = xp % 100

  const handleSelectCategory = (slug: CategorySlug) => {
    setSelectedCategory(slug)
    setPage('category')
    setSidebarOpen(false)
  }

  const handleSelectTextbook = (id: string) => {
    setTextbook(id)
    setPage('practice')
  }

  const goHome = () => {
    setPage('home')
    setSelectedCategory(null)
    setSidebarOpen(false)
  }

  const goWords = () => {
    setPage('words')
    setSidebarOpen(false)
  }

  const handleWrongWord = (word: HskWord) => {
    setWrongWords(prev => {
      if (prev.find(w => w.id === word.id)) return prev
      return [...prev, word].slice(-100) // 最多100个错词
    })
  }

  const cat = selectedCategory ? categories.find((c) => c.slug === selectedCategory) : null

  const catName = (c: typeof categories[0]) => lang === 'en' ? c.nameEn : c.name
  const catDesc = (c: typeof categories[0]) => {
    const map: Record<string, string> = {
      comprehensive: t('cat_comprehensive_desc', lang),
      hsk: t('cat_hsk_desc', lang),
      oral: t('cat_oral_desc', lang),
      vocational: t('cat_vocational_desc', lang),
    }
    return map[c.slug] || c.description
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8F6FF' }}>

      {/* ====== 顶部导航栏 ====== */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          {/* 汉堡按钮（移动端） */}
          <button onClick={() => setSidebarOpen(o => !o)}
                  className="sm:hidden flex flex-col gap-1 p-2 rounded-lg hover:bg-slate-100">
            <span className="w-5 h-0.5 bg-slate-600 rounded" />
            <span className="w-5 h-0.5 bg-slate-600 rounded" />
            <span className="w-5 h-0.5 bg-slate-600 rounded" />
          </button>

          {/* 返回 */}
          {(page === 'practice' || page === 'category') && (
            <button
              onClick={page === 'practice' ? () => setPage('category') : goHome}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600
                         transition-colors font-medium -ml-1 px-2 py-1 rounded-lg hover:bg-slate-50">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {tt('back')}
            </button>
          )}

          {/* 首页按钮（非首页时显示） */}
          {page !== 'home' && (
            <button
              onClick={goHome}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600
                         transition-colors font-medium px-2 py-1 rounded-lg hover:bg-indigo-50">
              🏠 <span className="hidden sm:inline">{tt('home')}</span>
            </button>
          )}

          {/* Logo */}
          <button onClick={goHome} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <span className="text-white text-sm font-black">趣</span>
            </div>
            <span className="text-lg font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hidden sm:inline">
              {lang === 'en' ? 'QuXue Chinese' : '趣学汉语'}
            </span>
          </button>

          {/* 面包屑 */}
          {page === 'practice' && cat && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <span>{cat.icon}</span><span>{catName(cat)}</span>
            </div>
          )}

          <div className="flex-1" />

          {/* 语言切换按钮 */}
          <button
            onClick={toggle}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 border border-slate-200"
            title={lang === 'zh' ? 'Switch to English' : '切换到中文'}
          >
            {tt('lang_toggle')}
          </button>

          {/* 游戏化状态栏 */}
          <div className="flex items-center gap-3 sm:gap-4">
            {streak > 0 && (
              <div className="flex items-center gap-1 animate-slide-down">
                <span className="text-base">🔥</span>
                <span className="text-xs font-bold text-orange-500">{streak}</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-slate-50 rounded-full px-3 py-1.5 border border-slate-200/80">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                <span className="text-[10px] font-black text-white">{level}</span>
              </div>
              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                     style={{ width: `${xpInLevel}%` }} />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
              <span>✅</span><span className="font-semibold">{totalDone}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ====== 主体：侧边栏 + 内容 ====== */}
      <div className="flex flex-1 max-w-6xl mx-auto w-full">

        {/* ── 侧边栏遮罩（移动端） ── */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/30 sm:hidden"
               onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── 侧边栏 ── */}
        <aside className={`
          fixed sm:sticky top-14 z-40 sm:z-auto
          h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-3.5rem)]
          w-56 bg-white border-r border-slate-200/70
          flex flex-col py-4 gap-0.5 overflow-y-auto
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
        `}>
          <NavItem icon="🏠" label={tt('nav_home')} active={page === 'home'} onClick={goHome} />
          <NavItem icon="📖" label={tt('nav_words')} active={page === 'words'} onClick={goWords} badge={wrongWords.length > 0 ? wrongWords.length : undefined} />
          <div className="mx-4 my-2 border-t border-slate-100" />
          <p className="px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{tt('nav_practice')}</p>
          {categories.map(c => (
            <NavItem key={c.slug} icon={c.icon} label={catName(c)}
                     active={page === 'category' && selectedCategory === c.slug}
                     onClick={() => handleSelectCategory(c.slug as CategorySlug)} />
          ))}
        </aside>

        {/* ── 主内容区 ── */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 sm:py-8">

          {/* 首页 */}
          {page === 'home' && (
            <div className="space-y-0">
              {/* ====== Hero ====== */}
              <section className="hero-banner relative text-center py-14 sm:py-20 px-6 sm:px-10 overflow-hidden rounded-3xl">
                {[
                  { emoji: '📚', top: '8%', left: '4%', size: '44px' },
                  { emoji: '🎯', top: '18%', right: '6%', size: '34px' },
                  { emoji: '✏️', bottom: '12%', left: '8%', size: '38px' },
                  { emoji: '🌟', bottom: '22%', right: '4%', size: '40px' },
                ].map((e, i) => (
                  <div key={i} className="floating-shape opacity-20"
                       style={{ top: e.top, left: e.left, right: (e as any).right, bottom: (e as any).bottom, fontSize: e.size }}>
                    {e.emoji}
                  </div>
                ))}
                <div className="relative z-10 max-w-[800px] mx-auto space-y-6">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                    🔥 {tt('hero_badge')}
                  </div>
                  <h1 className="text-[36px] sm:text-[52px] font-extrabold leading-tight"
                      style={{ letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    {tt('hero_title')}
                  </h1>
                  <p className="text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
                    {[
                      { key: 'hero_tag1' as const },
                      { key: 'hero_tag2' as const },
                      { key: 'hero_tag3' as const },
                      { key: 'hero_tag4' as const },
                    ].map(({ key }) => (
                      <span key={key} className="inline-block px-3 py-1 rounded-lg font-medium bg-white/70 text-slate-600 border border-slate-200/60 shadow-sm mx-0.5 mb-1">{tt(key)}</span>
                    ))}
                  </p>
                  <div className="flex justify-center gap-4 sm:gap-5 flex-wrap pt-2">
                    {[
                      { icon: '📝', value: totalDone, label: tt('hero_stat_done'), color: '#3b82f6' },
                      { icon: '🏆', value: level,     label: tt('hero_stat_level'), color: '#8b5cf6' },
                      { icon: '🔥', value: streak,    label: tt('hero_stat_streak'), color: '#f59e0b' },
                    ].map(s => (
                      <div key={s.label} className="bg-white rounded-2xl px-6 sm:px-9 py-4 sm:py-5 min-w-[130px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-100 hover:shadow-[0_6px_24px_rgba(0,0,0,0.10)] transition-all duration-200 hover:-translate-y-0.5">
                        <div className="text-2xl mb-1">{s.icon}</div>
                        <div className="text-[28px] sm:text-[36px] font-black leading-none" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-xs mt-1.5 text-slate-400">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 flex justify-center gap-3 flex-wrap">
                    <button onClick={() => { const f = categories[0]?.slug; if (f) handleSelectCategory(f as CategorySlug) }}
                            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-base font-bold transition-all duration-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(59,130,246,0.35)] hover:shadow-[0_6px_28px_rgba(59,130,246,0.45)]">
                      🚀 {tt('hero_btn_practice')}
                    </button>
                    <button onClick={goWords}
                            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-indigo-600 rounded-full text-base font-bold transition-all duration-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-indigo-100 hover:border-indigo-300">
                      📖 {tt('hero_btn_words')}
                    </button>
                  </div>
                </div>
              </section>

              {/* ====== Feature Cards ====== */}
              <section className="py-12 sm:py-16">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-[28px] font-bold text-slate-800">{tt('features_title')}</h2>
                  <p className="text-sm text-slate-400 mt-1">{tt('features_sub')}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {[
                    { icon: '🧩', title: tt('feat_drag_title'), desc: tt('feat_drag_desc'), color: '#6C5CE7', bg: 'rgba(108,92,231,0.08)' },
                    { icon: '👀', title: tt('feat_type_title'), desc: tt('feat_type_desc'), color: '#F472B6', bg: 'rgba(244,114,182,0.08)' },
                    { icon: '🎧', title: tt('feat_dict_title'), desc: tt('feat_dict_desc'), color: '#FF8A65', bg: 'rgba(255,138,101,0.08)' },
                    { icon: '✍️', title: tt('feat_stroke_title'), desc: tt('feat_stroke_desc'), color: '#66BB6A', bg: 'rgba(102,187,106,0.08)' },
                    { icon: '📖', title: tt('feat_vocab_title'), desc: tt('feat_vocab_desc'), color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
                  ].map((f, i) => (
                    <div key={f.title} className="feature-card bg-white rounded-2xl p-4 sm:p-5 text-center cursor-default border border-transparent relative overflow-hidden animate-slide-up"
                         style={{ animationDelay: `${i * 0.05 + 0.1}s`, animationFillMode: 'both', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: f.color }} />
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mx-auto mb-2.5" style={{ background: f.bg }}>{f.icon}</div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-800">{f.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ====== 学习数据看板 ====== */}
              <section className="py-6">
                <div className="text-center mb-5">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{tt('progress_title')}</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: '🔥', value: streak, label: tt('progress_streak'), sub: 'Day Streak', color: '#f59e0b' },
                    { icon: '⭐', value: xp, label: tt('progress_xp'), sub: 'Total XP', color: '#6366f1' },
                    { icon: '🏆', value: level, label: tt('progress_level'), sub: 'Level', color: '#8b5cf6' },
                    { icon: '📝', value: totalDone, label: tt('progress_done'), sub: 'Sentences', color: '#3b82f6' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl p-4 text-center border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-2xl mb-1">{s.icon}</div>
                      <div className="text-2xl sm:text-3xl font-black leading-none" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-xs font-semibold text-slate-600 mt-1">{s.label}</div>
                      <div className="text-[10px] text-slate-400">{s.sub}</div>
                    </div>
                  ))}
                </div>
                {/* XP进度条 */}
                <div className="mt-3 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500">{tt('progress_level_bar')} Level {level} → {level + 1}</span>
                    <span className="text-xs text-slate-400">{xpInLevel}/100 XP</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700"
                         style={{ width: `${xpInLevel}%` }} />
                  </div>
                </div>
              </section>

              {/* ====== 选择学习方向 ====== */}
              <section className="pb-16 sm:pb-20">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-[28px] font-bold text-slate-800">{tt('choose_direction')}</h2>
                  <p className="text-sm text-slate-400 mt-1">{tt('choose_direction_sub')}</p>
                </div>
                <CategoryGrid onSelectCategory={handleSelectCategory} lang={lang} />
              </section>
            </div>
          )}

          {/* ── 背单词页 ── */}
          {page === 'words' && (
            <WordCardPage
              onXP={pts => setXp(x => x + pts)}
              onWrongWord={handleWrongWord}
              wrongWords={wrongWords}
              onRemoveWrongWord={id => setWrongWords(prev => prev.filter(w => w.id !== id))}
              lang={lang}
            />
          )}

          {/* ── 分类页 ── */}
          {page === 'category' && selectedCategory && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm
                  ${cat?.slug === 'comprehensive' ? 'bg-blue-100' : ''}
                  ${cat?.slug === 'hsk' ? 'bg-red-100' : ''}
                  ${cat?.slug === 'oral' ? 'bg-emerald-100' : ''}
                  ${cat?.slug === 'vocational' ? 'bg-purple-100' : ''}
                `}>{cat?.icon}</div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{cat ? catName(cat) : ''}</h2>
                  <p className="text-sm text-slate-400">{cat ? catDesc(cat) : ''}</p>
                </div>
              </div>
              <TextbookList categoryId={selectedCategory} onSelectTextbook={handleSelectTextbook} lang={lang} />
            </div>
          )}

          {/* ── 练习页 ── */}
          {page === 'practice' && (
            <PracticePage
              onCorrect={() => { setXp(x => x + 10); setStreak(s => s + 1); setTotalDone(d => d + 1) }}
              onWrong={() => { setStreak(0) }}
              onGoToWords={goWords}
              lang={lang}
            />
          )}

        </main>
      </div>

      {/* ── 移动端底部导航 ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex">
        <MobileNavBtn icon="🏠" label={tt('nav_home')}   active={page==='home'}  onClick={goHome} />
        <MobileNavBtn icon="📖" label={tt('nav_words_short')}   active={page==='words'} onClick={goWords} />
        <MobileNavBtn icon="📚" label={tt('nav_practice_short')}   active={page==='category'||page==='practice'} onClick={() => handleSelectCategory(categories[0]?.slug as CategorySlug)} />
      </nav>
      <div className="sm:hidden h-16" /> {/* 底部导航占位 */}

      {/* ====== 底部 ====== */}
      <footer className="hidden sm:block bg-white py-5 text-center border-t" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
        <div className="max-w-5xl mx-auto px-4 text-xs" style={{ color: '#A69BBF' }}>
          {tt('footer')}
        </div>
      </footer>
    </div>
  )
}

// ── 侧边栏导航项 ─────────────────────────────────────────────────────────────
function NavItem({ icon, label, active, onClick, badge }: {
  icon: string; label: string; active: boolean; onClick: () => void; badge?: number
}) {
  return (
    <button onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl text-sm font-medium transition-all
              ${active
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
            style={{ width: 'calc(100% - 16px)' }}>
      <span className="text-base leading-none">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-[11px] bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 font-semibold">{badge}</span>
      )}
    </button>
  )
}

// ── 移动端底部导航按钮 ────────────────────────────────────────────────────────
function MobileNavBtn({ icon, label, active, onClick }: {
  icon: string; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors
              ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
      <span className="text-xl leading-none">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

export default App
