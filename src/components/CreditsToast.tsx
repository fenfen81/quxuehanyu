import { useCallback, useEffect, useState } from 'react'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

export type CreditsToastKind = 'warning' | 'critical'

/** 右下角低积分提醒：8 秒自动消失，可手动 × */
export function CreditsToast({ kind, credits, lang = 'zh', onGoEarn, onClose }: {
  kind: CreditsToastKind
  credits: number
  lang?: Lang
  onGoEarn: () => void
  onClose: () => void
}) {
  const tt = (k: Parameters<typeof t>[0]) => t(k, lang)
  const isCritical = kind === 'critical'

  useEffect(() => {
    const id = setTimeout(onClose, 8000)
    return () => clearTimeout(id)
  }, [onClose])

  return (
    <div
      role="status"
      className={`fixed bottom-6 right-6 z-[150] max-w-sm w-[360px] bg-white rounded-2xl shadow-2xl border ${
        isCritical ? 'border-red-200' : 'border-amber-200'
      } p-4 flex items-start gap-3 animate-slide-up`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${
        isCritical ? 'bg-red-100' : 'bg-amber-100'
      }`}>
        {isCritical ? '🚨' : '⚡'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-800">
          {isCritical
            ? tt('toast_critical_title').replace('N', String(credits))
            : tt('toast_warn_title').replace('N', String(credits))}
        </div>
        <div className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
          {isCritical ? tt('toast_critical_desc') : tt('toast_warn_desc')}
        </div>
        <button
          onClick={() => { onClose(); onGoEarn() }}
          className={`mt-2 text-xs font-semibold text-white px-3.5 py-1.5 rounded-full transition-all active:scale-95 ${
            isCritical ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
          }`}
        >
          {tt('toast_cta')}
        </button>
      </div>
      <button onClick={onClose}
        className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1 -mt-1 -mr-1"
        aria-label="close">×</button>
    </div>
  )
}

/**
 * 追踪积分余额跨过阈值的 hook（每个会话每个阈值只弹一次，sessionStorage 记忆）
 * - threshold=100（≈ 5 次练习）：温和提醒
 * - threshold=40（≈ 2 次练习）：强烈提醒
 * 当余额回升到 threshold + 100 以上时，自动"重新武装"，下次再降会再提醒
 */
export function useLowCreditToast(credits: number | null) {
  const STORAGE_KEY = 'qx_low_credit_warn'
  const [toast, setToast] = useState<{ kind: CreditsToastKind; credits: number } | null>(null)
  const dismiss = useCallback(() => setToast(null), [])

  useEffect(() => {
    if (credits == null) return
    // 读取本会话已提醒的阈值
    let warned: number = 0
    try { warned = parseInt(sessionStorage.getItem(STORAGE_KEY) || '0', 10) || 0 } catch {}

    if (credits <= 40 && warned < 40) {
      setToast({ kind: 'critical', credits })
      try { sessionStorage.setItem(STORAGE_KEY, '40') } catch {}
    } else if (credits <= 100 && warned < 100) {
      setToast({ kind: 'warning', credits })
      try { sessionStorage.setItem(STORAGE_KEY, '100') } catch {}
    } else if (credits > (warned || 0) + 100) {
      // 回升到阈值 + 100 以上，重新武装
      try { sessionStorage.removeItem(STORAGE_KEY) } catch {}
    }
  }, [credits])

  return { toast, dismiss }
}
