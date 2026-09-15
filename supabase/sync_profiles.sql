-- ============================================
--  趣学汉语 · 修复 profiles 自动同步（幂等，可重复执行）
--
--  问题根因：
--    网站注册时只把姓名/手机号/付费意愿写进 auth.users 的
--    raw_user_meta_data 字段，并不会自动写进 public.profiles 表，
--    导致新注册学员在 profiles 表里看不到。
--
--  本脚本作用：
--    1) 确保 profiles 表结构完整（email/full_name/phone/wants_paid/created_at）
--    2) 创建触发器：新用户注册时自动写入 profiles
--    3) 回填历史用户：把 auth.users 中已存在但 profiles 缺失的补齐
--
--  使用方法：
--    全选复制 → Supabase Dashboard → SQL Editor → New query → 粘贴 → Run
--    执行后看底部的 NOTICE 输出，会显示 "auth.users=XX, profiles=YY"
-- ============================================

-- ── 1. 确保 profiles 表存在且列完整（幂等）─────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY,
  email       text,
  full_name   text,
  phone       text,
  wants_paid  boolean DEFAULT FALSE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 安全添加可能缺失的列（已存在的列会跳过，不会报错）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email       text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name   text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone       text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wants_paid  boolean DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at  timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

-- ── 2. RLS 行级安全（已登录用户只能看自己的）──────────────
--    注意：您在 Supabase Dashboard 用的是 service_role 权限，
--    不受 RLS 限制，所以您仍然能看到全部用户的 profiles。

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- ── 3. 触发器函数：新用户注册时自动写入 profiles ─────────
--    从 auth.users 的 raw_user_meta_data JSON 里提取
--    full_name / phone / wants_paid 等字段

CREATE OR REPLACE FUNCTION public.sync_profile_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, wants_paid, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'wants_paid')::boolean, FALSE),
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = EXCLUDED.full_name,
    phone      = EXCLUDED.phone,
    wants_paid = EXCLUDED.wants_paid,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- 绑定触发器到 auth.users（每次有新用户 INSERT 时自动执行）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_on_signup();

-- ── 4. 回填历史用户：把已有的注册用户补进 profiles ───────
--    只补 profiles 里还没有的（LEFT JOIN IS NULL），已有的不动

INSERT INTO public.profiles (id, email, full_name, phone, wants_paid, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  COALESCE(u.raw_user_meta_data->>'phone', ''),
  COALESCE((u.raw_user_meta_data->>'wants_paid')::boolean, FALSE),
  u.created_at,
  now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ── 5. 诊断输出（执行后在底部 Messages 面板查看）─────────
DO $$
DECLARE
  v_auth  int;
  v_prof  int;
  v_new   int;
BEGIN
  v_auth := (SELECT count(*) FROM auth.users);
  v_prof := (SELECT count(*) FROM public.profiles);
  RAISE NOTICE '========================================';
  RAISE NOTICE '  ✅ profiles 同步完成！';
  RAISE NOTICE '  auth.users 总注册用户: %', v_auth;
  RAISE NOTICE '  profiles 总记录数:     %', v_prof;
  RAISE NOTICE '  （如果两个数字一致，说明所有用户都已同步）';
  RAISE NOTICE '========================================';
END $$;
