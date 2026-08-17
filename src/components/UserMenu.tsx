import { useState, useRef, useEffect } from 'react'
import { useCredits } from '@/hooks/useCredits'
import type { Session } from '@supabase/supabase-js'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

/** 顶栏用户气泡：头像 + 姓名 + 积分 + 下拉箭头；点开菜单（个人中心/问卷/退出） */
export function UserMenu({ session, lang = 'zh', onGoProfile, onGoSurvey, onLogout }: {
  session: Session
  lang?: Lang
  onGoProfile: () => void
  onGoSurvey: () => void
  onLogout: () => void
}) {
  const tt = (k: Parameters<typeof t>[0]) => t(k, lang)
  const { credits } = useCredits(session)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // 解析显示名：注册时填的 full_name 优先，否则取邮箱 @ 前部分
  const metaName = (session.user.user_metadata as { full_name?: string } | undefined)?.full_name?.trim()
  const emailName = session.user.email?.split('@')[0]
  const displayName = metaName || emailName || 'User'
  const initial = displayName.charAt(0).toUpperCase()

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handle = (fn: () => void) => () => { setOpen(false); fn() }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200/80 transition-all active:scale-95"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
          {initial}
        </div>
        <span className="text-sm font-bold text-slate-700 max-w-[80px] truncate">{displayName}</span>
        <span className="text-sm font-black text-amber-700 tabular-nums">🪙 {credits ?? '…'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-600">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/70 overflow-hidden z-50 animate-scale-in">
          <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100">
            <div className="text-xs text-slate-500">{tt('um_signed_in_as')}</div>
            <div className="text-sm font-bold text-slate-800 truncate">{displayName}</div>
            {session.user.email && (
              <div className="text-[11px] text-slate-400 truncate">{session.user.email}</div>
            )}
          </div>
          <div className="py-1">
            <MenuItem icon="👤" label={tt('nav_profile')} onClick={handle(onGoProfile)} />
            <MenuItem icon="📋" label={tt('profile_survey_btn')} sub="+200" onClick={handle(onGoSurvey)} />
            <div className="my-1 mx-2 border-t border-slate-100" />
            <MenuItem icon="🚪" label={tt('logout')} danger onClick={handle(onLogout)} />
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon, label, sub, danger, onClick }: {
  icon: string; label: string; sub?: string; danger?: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-indigo-50/50 hover:text-indigo-700'
      }`}>
      <span className="text-base">{icon}</span>
      <span className="flex-1">{label}</span>
      {sub && <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">+{sub.replace('+', '')}</span>}
    </button>
  )
}
