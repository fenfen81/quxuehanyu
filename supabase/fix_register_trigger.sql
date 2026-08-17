-- ============================================
-- 趣学汉语 · 修复注册触发器（fail-safe 版）
-- 作用：
--   1) 任何积分逻辑错误都【绝不】阻断学生注册（之前会报
--      "Database error saving new user"，导致谁都注册不了）
--   2) 保留：注册送 500 积分 + 随机邀请码 + 推荐人 +100
--   3) 积分逻辑若出错，只记一条日志，注册照常成功
-- 使用方法：全选复制 → Supabase SQL Editor → New query → 粘贴 → Run
-- ============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref  uuid;
  v_code text;
begin
  begin
    -- 校验邀请码（防自荐：id <> new.id）
    select id into v_ref
      from public.user_credits
     where referral_code = coalesce(new.raw_user_meta_data->>'referral_code', '')
       and id <> new.id
     limit 1;

    -- 生成唯一邀请码（8 位大写，冲突自动重试）
    loop
      v_code := upper(substr(md5(random()::text), 1, 8));
      begin
        insert into public.user_credits (user_id, credits, referral_code, referred_by)
          values (new.id, 500, v_code, v_ref);
        exit;
      exception when unique_violation then
        null;
      end;
    end loop;

    -- 注册流水
    insert into public.credit_transactions (user_id, delta, reason)
      values (new.id, 500, 'signup');

    -- 推荐奖励：推荐人 +100
    if v_ref is not null then
      update public.user_credits set credits = credits + 100 where user_id = v_ref;
      insert into public.credit_transactions (user_id, delta, reason, related_user_id)
        values (v_ref, 100, 'referral', new.id);
    end if;
  exception when others then
    -- 绝不因积分逻辑失败而阻止注册；记 warning 日志供排查
    raise warning 'handle_new_user: user % credits-skip error: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

-- ============================================
-- 诊断：手动模拟"积分插入"，看真实报错
-- 输出 "OK: 模拟插入成功"        = 积分逻辑没问题
-- 输出 "ERROR: 一串英文"          = 那串英文就是问题根因，请发给助手
-- ============================================
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.user_credits (user_id, credits, referral_code, referred_by)
  VALUES (v_id, 500, 'ZZZZ0001', NULL);
  INSERT INTO public.credit_transactions (user_id, delta, reason)
  VALUES (v_id, 500, 'signup');
  RAISE NOTICE 'OK: 模拟插入成功';
  DELETE FROM public.credit_transactions WHERE user_id = v_id;
  DELETE FROM public.user_credits WHERE user_id = v_id;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERROR: %', SQLERRM;
END $$;
