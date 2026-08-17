import { useState, useRef, useEffect } from 'react'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

// 邀请链接固定用线上域名（不受当前页面 origin 影响，本地预览也不会生成错误的 IP 地址）
const SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || 'https://www.quxuehanyu.com'

/** 顶栏"赚积分"小弹窗：展示 3 种赚分方式 + 快捷 CTA */
export function EarnCreditsPopover({ lang = 'zh', referralCode, onGoSurvey, onGoProfile, onClose }: {
  lang?: Lang
  referralCode: string | null
  onGoSurvey: () => void
  onGoProfile: () => void
  onClose: () => void
}) {
  const tt = (k: Parameters<typeof t>[0]) => t(k, lang)
  const [copied, setCopied] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const inviteLink = referralCode ? `${SITE_URL}/?ref=${referralCode}` : ''

  const copyLink = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  return (
    <div ref={wrapRef} className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/70 overflow-hidden z-50 animate-scale-in">
      <div className="px-4 py-3 bg-gradient-to-br from-amber-50 to-orange-50 border-b border-amber-100">
        <div className="text-sm font-bold text-slate-800">{tt('earn_title')}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{tt('earn_subtitle')}</div>
      </div>
      <div className="p-2.5 space-y-1.5">
        {/* 每日登录 */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50/70">
          <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold shrink-0">+100</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800">{tt('earn_daily_title')}</div>
            <div className="text-[11px] text-slate-500">{tt('earn_daily_desc')}</div>
          </div>
          <button onClick={onGoProfile}
            className="text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors">
            {tt('earn_daily_cta')}
          </button>
        </div>
        {/* 问卷 */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-indigo-50/70">
          <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-bold shrink-0">+200</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800">{tt('earn_survey_title')}</div>
            <div className="text-[11px] text-slate-500">{tt('earn_survey_desc')}</div>
          </div>
          <button onClick={onGoSurvey}
            className="text-xs font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors">
            {tt('earn_survey_cta')}
          </button>
        </div>
        {/* 推荐 */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50/70">
          <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold shrink-0">+100</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800">{tt('earn_referral_title')}</div>
            <div className="text-[11px] text-slate-500">{tt('earn_referral_desc')}</div>
          </div>
          <button onClick={copyLink} disabled={!inviteLink}
            className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors disabled:opacity-50">
            {copied ? `✅ ${tt('credits_copied')}` : tt('credits_copy')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** 顶栏"赚积分"触发按钮（含弹窗状态） */
export function EarnCreditsTrigger({ lang = 'zh', referralCode, onGoSurvey, onGoProfile }: {
  lang?: Lang
  referralCode: string | null
  onGoSurvey: () => void
  onGoProfile: () => void
}) {
  const tt = (k: Parameters<typeof t>[0]) => t(k, lang)
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 text-xs font-semibold transition-all active:scale-95"
        title={tt('earn_title')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        <span className="hidden sm:inline">{tt('earn_title')}</span>
      </button>
      {open && (
        <EarnCreditsPopover
          lang={lang}
          referralCode={referralCode}
          onGoSurvey={() => { setOpen(false); onGoSurvey() }}
          onGoProfile={() => { setOpen(false); onGoProfile() }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
