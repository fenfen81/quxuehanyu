import { supabase } from './supabaseClient'

// ══════════════════════════════════════════════════════════════════════════════
//  积分系统 RPC 封装层
//  所有积分增减都走 Supabase RPC（服务端原子操作），前端绝不直接写数据库。
// ══════════════════════════════════════════════════════════════════════════════

export const CREDIT = {
  SIGNUP: 500,   // 注册赠送
  SPEND: 20,     // 每次开始练习消耗
  SURVEY: 200,   // 完成问卷奖励
  DAILY: 100,    // 每日登录奖励
  REFERRAL: 100, // 推荐成功奖励
} as const

export type CreditReason = 'signup' | 'daily' | 'survey' | 'referral' | 'spend'
export type SpendResult = 'ok' | 'insufficient'

export interface CreditInfo {
  user_id: string
  credits: number
  last_daily_date: string | null
  referral_code: string
  referred_by: string | null
  survey_done: boolean
  created_at: string
}

export interface CreditTx {
  id: number
  user_id: string
  delta: number
  reason: CreditReason
  related_user_id: string | null
  created_at: string
}

/** 积分变动后广播事件，顶栏/个人中心自动刷新 */
function emitChanged() {
  try { window.dispatchEvent(new CustomEvent('credits:changed')) } catch {}
}

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T) ?? null
  return (data as T) ?? null
}

/** 查本人积分信息（余额/邀请码/是否已填问卷/每日领取日期） */
export async function getCreditInfo(): Promise<CreditInfo | null> {
  const { data, error } = await supabase.rpc('get_my_credits')
  if (error) throw error
  return firstRow<CreditInfo>(data)
}

/** 查本人积分余额 */
export async function getCredits(): Promise<number> {
  const info = await getCreditInfo()
  return info?.credits ?? 0
}

/** 查本人积分流水（倒序） */
export async function listTransactions(limit = 50): Promise<CreditTx[]> {
  const { data, error } = await supabase.rpc('list_my_transactions', { p_limit: limit })
  if (error) throw error
  return (Array.isArray(data) ? data : []) as CreditTx[]
}

/**
 * 消耗积分（每次开始一次练习）
 * 返回 'ok' | 'insufficient'；网络/服务端其他错误会抛异常，调用方可选择放行。
 */
export async function spendCredits(amount = CREDIT.SPEND): Promise<SpendResult> {
  const { error } = await supabase.rpc('spend_credits', { p_amount: amount })
  if (!error) {
    emitChanged()
    return 'ok'
  }
  if (/insufficient/i.test(error.message)) return 'insufficient'
  throw error
}

/** 每日登录领积分，返回是否领取成功（今天已领过则 false） */
export async function grantDailyCredits(): Promise<boolean> {
  const { data, error } = await supabase.rpc('grant_daily_credits')
  if (error) throw error
  if (data === true) emitChanged()
  return data === true
}

/** 完成问卷领积分，返回是否发放成功（已领过一次则 false） */
export async function grantSurveyCredits(): Promise<boolean> {
  const { data, error } = await supabase.rpc('grant_survey_credits')
  if (error) throw error
  if (data === true) emitChanged()
  return data === true
}

/** 校验邀请码是否存在（注册页可选提示用） */
export async function validateReferralCode(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('validate_referral_code', { p_code: code.trim() })
  if (error) return false
  return data === true
}
