-- ============================================
-- 趣学汉语 · 修复积分列名（id → user_id）
-- 原因：user_credits 表主键列叫 user_id，之前写成了 id，
--       导致"查推荐人"时报 column "id" does not exist，
--       注册送积分一直失败。
-- 使用方法：全选复制 → Supabase SQL Editor → New query → 粘贴 → Run
-- 执行后务必看底部是否显示 "Success"；有红色错误请把错误发给我。
-- ============================================

-- 1) 修复 get_my_credits（登录后懒补发积分，最关键）
create or replace function public.get_my_credits()
returns setof public.user_credits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ref uuid;
  v_code text;
begin
  if v_uid is null then return; end if;

  if not exists (select 1 from public.user_credits where user_id = v_uid) then
    select user_id into v_ref
      from public.user_credits
     where referral_code = coalesce(
       (select raw_user_meta_data->>'referral_code' from auth.users where id = v_uid), ''
     )
       and user_id <> v_uid
     limit 1;

    loop
      v_code := upper(substr(md5(random()::text), 1, 8));
      begin
        insert into public.user_credits (user_id, credits, referral_code, referred_by)
          values (v_uid, 500, v_code, v_ref);
        exit;
      exception when unique_violation then
        null;
      end;
    end loop;

    insert into public.credit_transactions (user_id, delta, reason)
      values (v_uid, 500, 'signup');

    if v_ref is not null then
      update public.user_credits set credits = credits + 100 where user_id = v_ref;
      insert into public.credit_transactions (user_id, delta, reason, related_user_id)
        values (v_ref, 100, 'referral', v_uid);
    end if;
  end if;

  return query select * from public.user_credits where user_id = v_uid;
end;
$$;

-- 2) 修复注册触发器里同样的问题（保持一致）
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
    select user_id into v_ref
      from public.user_credits
     where referral_code = coalesce(new.raw_user_meta_data->>'referral_code', '')
       and user_id <> new.id
     limit 1;

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

    insert into public.credit_transactions (user_id, delta, reason)
      values (new.id, 500, 'signup');

    if v_ref is not null then
      update public.user_credits set credits = credits + 100 where user_id = v_ref;
      insert into public.credit_transactions (user_id, delta, reason, related_user_id)
        values (v_ref, 100, 'referral', new.id);
    end if;
  exception when others then
    raise warning 'handle_new_user: user % credits-skip error: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;
