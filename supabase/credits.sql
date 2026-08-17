-- ══════════════════════════════════════════════════════════════════════════════
--  趣学汉语 · 积分试用系统 — 数据库脚本
--  在 Supabase Dashboard → SQL Editor 中执行本文件（可重复执行，全部幂等）
--  说明：积分写操作只经 RPC（SECURITY DEFINER），前端绝不直写数据库
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. 建表 ───────────────────────────────────────────────────────────────────

create table if not exists public.user_credits (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  credits          int  not null default 0 check (credits >= 0),
  last_daily_date  date,
  referral_code    text not null unique,
  referred_by      uuid references auth.users(id),
  survey_done      boolean not null default false,
  created_at       timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  delta            int  not null,
  reason           text not null check (reason in ('signup','daily','survey','referral','spend')),
  related_user_id  uuid references auth.users(id),
  created_at       timestamptz not null default now()
);
create index if not exists idx_credit_tx_user on public.credit_transactions (user_id, created_at desc);

create table if not exists public.survey_responses (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  answers    jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_survey_user on public.survey_responses (user_id);

-- ── 2. 行级安全 RLS ───────────────────────────────────────────────────────────

alter table public.user_credits        enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.survey_responses    enable row level security;

-- user_credits：只允许本人查看（写操作全部走 RPC）
drop policy if exists user_credits_select_own on public.user_credits;
create policy user_credits_select_own on public.user_credits
  for select using (auth.uid() = user_id);

-- credit_transactions：只允许本人查看（写操作由 RPC/触发器完成）
drop policy if exists credit_tx_select_own on public.credit_transactions;
create policy credit_tx_select_own on public.credit_transactions
  for select using (auth.uid() = user_id);

-- survey_responses：本人可查看 + 本人可插入（问卷页直接 insert 答案）
drop policy if exists survey_select_own on public.survey_responses;
create policy survey_select_own on public.survey_responses
  for select using (auth.uid() = user_id);
drop policy if exists survey_insert_own on public.survey_responses;
create policy survey_insert_own on public.survey_responses
  for insert with check (auth.uid() = user_id);

-- ── 3. 注册触发器：新用户自动建积分行（500 积分 + 随机邀请码 + 推荐人 +100）──

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
  -- 校验邀请码（防自荐：id <> new.id；referred_by 非空时不再重复发奖）
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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 3.5 老用户回填（幂等）─────────────────────────────────────────────────────
-- 在触发器创建之前就注册的账号（含线上老用户），补建积分行（500 积分 + 邀请码）
-- 和 signup 流水；已存在的行不受影响。这样无论"先跑 SQL 还是先部署"，都不丢积分。
insert into public.user_credits (user_id, credits, referral_code, referred_by)
select u.id, 500, upper(substr(md5(random()::text || u.id::text), 1, 8)), null
  from auth.users u
 where not exists (select 1 from public.user_credits c where c.user_id = u.id)
on conflict (user_id) do nothing;

insert into public.credit_transactions (user_id, delta, reason)
select c.user_id, 500, 'signup'
  from public.user_credits c
 where not exists (
   select 1 from public.credit_transactions t
    where t.user_id = c.user_id and t.reason = 'signup'
 );

-- ── 4. RPC 函数（全部 SECURITY DEFINER）──────────────────────────────────────

-- 4.1 查本人积分行
create or replace function public.get_my_credits()
returns setof public.user_credits
language sql
security definer
set search_path = public
as $$
  select * from public.user_credits where user_id = auth.uid();
$$;

-- 4.2 查本人积分流水
create or replace function public.list_my_transactions(p_limit int default 50)
returns setof public.credit_transactions
language sql
security definer
set search_path = public
as $$
  select * from public.credit_transactions
   where user_id = auth.uid()
   order by created_at desc, id desc
   limit greatest(1, least(p_limit, 200));
$$;

-- 4.3 每日登录领积分（+100，东八区每天一次）
create or replace function public.grant_daily_credits()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_today date;
begin
  if v_uid is null then return false; end if;
  v_today := (now() at time zone 'Asia/Shanghai')::date;
  update public.user_credits
     set credits = credits + 100, last_daily_date = v_today
   where user_id = v_uid
     and (last_daily_date is null or last_daily_date < v_today);
  if found then
    insert into public.credit_transactions (user_id, delta, reason)
      values (v_uid, 100, 'daily');
    return true;
  end if;
  return false;
end;
$$;

-- 4.4 完成问卷领积分（+200，仅一次）
create or replace function public.grant_survey_credits()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return false; end if;
  update public.user_credits
     set credits = credits + 200, survey_done = true
   where user_id = v_uid
     and survey_done = false;
  if found then
    insert into public.credit_transactions (user_id, delta, reason)
      values (v_uid, 200, 'survey');
    return true;
  end if;
  return false;
end;
$$;

-- 4.5 消耗积分（原子扣减，余额不足抛异常 INSUFFICIENT_CREDITS）
create or replace function public.spend_credits(p_amount int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;
  update public.user_credits
     set credits = credits - p_amount
   where user_id = v_uid
     and credits >= p_amount;
  if not found then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;
  insert into public.credit_transactions (user_id, delta, reason)
    values (v_uid, -p_amount, 'spend');
end;
$$;

-- 4.6 校验邀请码是否存在
create or replace function public.validate_referral_code(p_code text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.user_credits
     where referral_code = upper(trim(coalesce(p_code, '')))
  );
$$;

-- ── 5. 权限（默认 EXECUTE 已开放给 PUBLIC，这里显式再授权）────────────────────

grant execute on function public.get_my_credits()            to authenticated, anon;
grant execute on function public.list_my_transactions(int)   to authenticated;
grant execute on function public.grant_daily_credits()       to authenticated;
grant execute on function public.grant_survey_credits()      to authenticated;
grant execute on function public.spend_credits(int)          to authenticated;
grant execute on function public.validate_referral_code(text) to authenticated, anon;
