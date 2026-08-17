import { useState, useCallback, useEffect } from 'react'
import { useCredits } from '@/hooks/useCredits'
import { getCreditInfo, listTransactions, grantDailyCredits, CREDIT } from '@/lib/credits'
import type { CreditInfo, CreditTx } from '@/lib/credits'
import type { Session } from '@supabase/supabase-js'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

const REASON_LABELS = {
  signup: 'tx_signup',
  daily: 'tx_daily',
  survey: 'tx_survey',
  referral: 'tx_referral',
  spend: 'tx_spend',
} as const

function todayStrZh(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function ProfilePage({ session, lang = 'zh', onGoSurvey, onGoHome }: {
  session: Session
  lang?: Lang
  onGoSurvey: () => void
  onGoHome: () => void
}) {
  const tt = (k: Parameters<typeof t>[0]) => t(k, lang)
  const { credits, refresh } = useCredits(session)
  const [info, setInfo] = useState<CreditInfo | null>(null)
  const [txs, setTxs] = useState<CreditTx[]>([])
  const [claiming, setClaiming] = useState(false)
  const [claimMsg, setClaimMsg] = useState<'ok' | 'done' | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const [i, list] = await Promise.all([getCreditInfo(), listTransactions(50)])
      setInfo(i)
      setTxs(list)
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const dailyClaimedToday = info != null && info.last_daily_date === todayStrZh()

  const handleClaim = async () => {
    if (claiming || dailyClaimedToday) return
    setClaiming(true)
    setClaimMsg(null)
    try {
      const ok = await grantDailyCredits()
      setClaimMsg(ok ? 'ok' : 'done')
      await load()
      await refresh()
    } catch {
      setClaimMsg('done')
    } finally {
      setClaiming(false)
    }
  }

  const inviteLink = info?.referral_code
    ? `${window.location.origin}${window.location.pathname}?ref=${info.referral_code}`
    : ''

  const handleCopy = async () => {
    if (!info?.referral_code) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* ── 积分卡 ── */}
      <section className="rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-white border border-amber-100 p-6 sm:p-8 text-center relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-amber-100/50" />
        <div className="absolute -bottom-10 -left-8 w-28 h-28 rounded-full bg-orange-100/40" />
        <p className="text-xs font-semibold text-amber-600 tracking-wider uppercase">{tt('credits_balance')}</p>
        <div className="text-5xl sm:text-6xl font-black text-slate-800 my-3 tabular-nums">
          🪙 {credits ?? '…'}
        </div>
        <p className="text-xs text-slate-500">{tt('credits_spend_hint')}</p>
        <button
          onClick={handleClaim}
          disabled={claiming || dailyClaimedToday}
          className={`mt-5 px-6 py-3 rounded-full text-sm font-bold transition-all active:scale-95 ${
            dailyClaimedToday
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-[0_4px_16px_rgba(245,158,11,0.35)] hover:-translate-y-0.5'
          }`}
        >
          {dailyClaimedToday ? `${tt('credits_claimed_today')} ✅` : `${tt('credits_claim_daily')} +${CREDIT.DAILY}`}
        </button>
        {claimMsg && (
          <p className={`text-xs mt-2 ${claimMsg === 'ok' ? 'text-emerald-600' : 'text-slate-400'}`}>
            {claimMsg === 'ok' ? `${tt('credits_claim_success')} +${CREDIT.DAILY} 🎉` : tt('credits_already_claimed')}
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* ── 邀请 ── */}
        <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-1">🎁 {tt('profile_invite_title')}</h3>
          <p className="text-xs text-slate-400 mb-3">{tt('profile_invite_desc')}</p>
          {info?.referral_code ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <code className="flex-1 text-center py-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-black tracking-[0.2em] text-lg">
                  {info.referral_code}
                </code>
                <button onClick={handleCopy} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all">
                  {copied ? '✅' : tt('credits_copy')}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 break-all bg-slate-50 rounded-lg p-2">{inviteLink}</p>
              <p className="text-[11px] text-emerald-600 mt-2 font-medium">{tt('profile_invite_reward')}</p>
            </>
          ) : (
            <p className="text-sm text-slate-400">{tt('profile_invite_loading')}</p>
          )}
        </section>

        {/* ── 问卷入口 ── */}
        <section className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 mb-1">📋 {tt('profile_survey_title')}</h3>
          <p className="text-xs text-slate-400 mb-3 flex-1">{tt('profile_survey_desc')}</p>
          <button
            onClick={onGoSurvey}
            className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold transition-all active:scale-[0.98]"
          >
            {tt('profile_survey_btn')} +{CREDIT.SURVEY}
          </button>
          {info?.survey_done && (
            <p className="text-[11px] text-slate-400 mt-2 text-center">{tt('profile_survey_done')} ✅</p>
          )}
        </section>
      </div>

      {/* ── 积分流水 ── */}
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">📜 {tt('credits_history')}</h3>
        {txs.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">{tt('credits_no_history')}</p>
        ) : (
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
            {txs.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 ${tx.delta > 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {tx.reason === 'spend' ? '📖' : tx.reason === 'signup' ? '🎉' : tx.reason === 'daily' ? '📅' : tx.reason === 'survey' ? '📋' : '🎁'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-700">{tt(REASON_LABELS[tx.reason])}</div>
                  <div className="text-[11px] text-slate-400">
                    {new Date(tx.created_at).toLocaleString(lang === 'en' ? 'en-US' : 'zh-CN', { hour12: false })}
                  </div>
                </div>
                <span className={`text-base font-black tabular-nums ${tx.delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {tx.delta > 0 ? `+${tx.delta}` : tx.delta}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="text-center">
        <button onClick={onGoHome} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          ← {tt('profile_back_home')}
        </button>
      </div>
    </div>
  )
}
