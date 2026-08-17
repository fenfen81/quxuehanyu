import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

/** 余额不足付费墙弹窗：三出口 → 去问卷 / 去个人中心 / 关闭重试 */
export function PaywallDialog({ lang = 'zh', onClose, onGoSurvey, onGoProfile }: {
  lang?: Lang
  onClose: () => void
  onGoSurvey: () => void
  onGoProfile: () => void
}) {
  const tt = (k: Parameters<typeof t>[0]) => t(k, lang)

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
        <div className="px-6 pt-7 pb-6 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-2xl">
            🪙
          </div>
          <h3 className="text-lg font-bold text-slate-800">{tt('paywall_title')}</h3>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">{tt('paywall_desc')}</p>

          <div className="mt-5 space-y-2.5 text-left">
            <button
              onClick={onGoSurvey}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-all text-left"
            >
              <span className="text-xl">📋</span>
              <span className="flex-1">
                <span className="block text-sm font-bold text-indigo-700">{tt('credits_go_survey')}</span>
                <span className="block text-[11px] text-indigo-400">{tt('paywall_survey_hint')}</span>
              </span>
              <span className="text-xs font-black text-amber-600 bg-amber-100 rounded-full px-2 py-0.5">+200</span>
            </button>
            <button
              onClick={onGoProfile}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-100 transition-all text-left"
            >
              <span className="text-xl">👤</span>
              <span className="flex-1">
                <span className="block text-sm font-bold text-amber-700">{tt('credits_go_profile')}</span>
                <span className="block text-[11px] text-amber-500">{tt('paywall_profile_hint')}</span>
              </span>
              <span className="text-xs font-black text-amber-600 bg-amber-100 rounded-full px-2 py-0.5">+100</span>
            </button>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-all">
            {tt('paywall_retry')}
          </button>
        </div>
      </div>
    </div>
  )
}
