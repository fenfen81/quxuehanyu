import { useCallback, useEffect, useState } from 'react'
import { getCredits } from '@/lib/credits'
import type { Session } from '@supabase/supabase-js'

/**
 * 积分余额 Hook：
 * - 登录后自动加载余额
 * - 监听 'credits:changed' 事件（任何积分变动后自动刷新）
 * - 供顶栏徽章 / 个人中心 / 付费墙使用
 */
export function useCredits(session: Session | null) {
  const [credits, setCredits] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!session) {
      setCredits(null)
      return
    }
    setLoading(true)
    try {
      const c = await getCredits()
      setCredits(c)
    } catch {
      // 静默失败（如数据库脚本未执行/网络异常），保留旧值
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (!session) {
      setCredits(null)
      return
    }
    refresh()
    const handler = () => { refresh() }
    window.addEventListener('credits:changed', handler)
    return () => window.removeEventListener('credits:changed', handler)
  }, [session, refresh])

  return { credits, loading, refresh }
}
