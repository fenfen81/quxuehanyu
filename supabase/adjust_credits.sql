-- ══════════════════════════════════════════════════════════════════════════════
--  趣学汉语 · 积分批量调整（2026-09-05）
--  执行位置：Supabase Dashboard → SQL Editor → New query → 粘贴 → Run
--  幂等：可重复执行，重复执行时因为"新值 = 旧值"不会再产生流水
--
--  ① 为还没有积分行的注册用户补建（500 起步）
--  ② 所有用户积分【补足到 1000】：不足 1000 的补到 1000，已超过 1000 的保持不动
--  ③ 指定账号直接设为 10000：
--       7973940@qq.com / 12345678@qq.com / 123456@qq.com
--  ④ 每一笔调整都写入流水（reason = 'admin'），方便日后对账
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 0. 放宽流水表的 reason 约束（原只允许 signup/daily/survey/referral/spend）──
do $$
declare r record;
begin
  for r in
    select conname
      from pg_constraint
     where conrelid = 'public.credit_transactions'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) like '%reason%'
  loop
    execute format('alter table public.credit_transactions drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.credit_transactions
  add constraint credit_transactions_reason_check
  check (reason in ('signup','daily','survey','referral','spend','admin'));

-- ── 1. 补建缺失的积分行（防止个别老账号从来没有积分记录）──────────────────────
insert into public.user_credits (user_id, credits, referral_code, referred_by)
select u.id,
       500,
       upper(substr(md5(random()::text || u.id::text), 1, 8)),
       null
  from auth.users u
 where not exists (select 1 from public.user_credits c where c.user_id = u.id)
on conflict do nothing;

-- ── 2~3. 批量调整余额，并写入 admin 流水 ─────────────────────────────────────
with target as (
  select c.user_id,
         c.credits as old_credits,
         case
           when lower(coalesce(u.email, '')) in
                ('7973940@qq.com', '12345678@qq.com', '123456@qq.com')
             then 10000
           else greatest(c.credits, 1000)
         end as new_credits
    from public.user_credits c
    join auth.users u on u.id = c.user_id
), upd as (
  update public.user_credits c
     set credits = t.new_credits
    from target t
   where c.user_id = t.user_id
     and t.new_credits <> t.old_credits
  returning c.user_id, t.old_credits, t.new_credits
)
insert into public.credit_transactions (user_id, delta, reason)
select user_id, new_credits - old_credits, 'admin'
  from upd;

-- ── 4. 查看结果（执行后确认）──────────────────────────────────────────────────
select coalesce(u.email, '(无邮箱)') as email,
       c.credits,
       c.created_at
  from public.user_credits c
  left join auth.users u on u.id = c.user_id
 order by c.credits desc, c.created_at;
