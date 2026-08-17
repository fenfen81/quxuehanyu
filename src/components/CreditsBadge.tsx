import { useCredits } from '@/hooks/useCredits'
import type { Session } from '@supabase/supabase-js'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

/** 顶栏积分徽章：显示余额，点击跳转个人中心 */
export function CreditsBadge({ session, onClick, lang = 'zh' }: {
  session: Session | null
  onClick: () => void
  lang?: Lang
}) {
  const { credits } = useCredits(session)
  if (!session || credits === null) return null

  return (
    <button
      onClick={onClick}
      title={t('credits_balance', lang)}
      className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-full px-3 py-1.5 transition-all active:scale-95"
    >
      <span className="text-sm leading-none">🪙</span>
      <span className="text-xs font-bold text-amber-700 tabular-nums">{credits}</span>
    </button>
  )
}
