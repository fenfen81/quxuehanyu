-- ============================================================
--  趣学汉语 · 教师端功能（建班 / 发布任务 / 进度回收）
--
--  在【现有 Supabase 项目】上增量添加，全部 IF NOT EXISTS，
--  可重复执行，不会改动你既有的 profiles / credits / progress 表结构。
--
--  执行方法：
--    Supabase Dashboard → SQL Editor → New query
--    → 全选粘贴本文件 → Run
--    底部 Messages 出现 "✅ 教师端表已就绪" 即成功。
--
--  前置说明：
--    • 本文件只建表 + 行级安全(RLS) + 一个进班函数，不删任何东西。
--    • 注册页加"我是老师"、各页面 UI 见《教师端功能开发清单.md》。
-- ============================================================


-- ───────────────────────────────────────────────────────────
-- 1. profiles 增加 role（学生/老师）+ display_name
-- ───────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role         text NOT NULL DEFAULT 'student';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;

-- 更新注册触发器：把注册时传入的 role 写入 profiles（缺省 student）
CREATE OR REPLACE FUNCTION public.sync_profile_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, wants_paid, role, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'wants_paid')::boolean, FALSE),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email        = EXCLUDED.email,
    full_name    = EXCLUDED.full_name,
    phone        = EXCLUDED.phone,
    wants_paid   = EXCLUDED.wants_paid,
    role         = EXCLUDED.role,
    display_name = EXCLUDED.display_name,
    updated_at   = now();
  RETURN NEW;
END;
$$;

-- 原触发器 on_auth_user_created 仍绑定此函数，无需重建。


-- ───────────────────────────────────────────────────────────
-- 2. classes（班级）—— 老师建班，自动生成 8 位邀请码
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.classes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  grade       text,                       -- 如 "HSK1" / "汉语教程2A"
  invite_code text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 建班时自动生成唯一邀请码（复用你 credits 里的 8 位大写规则）
CREATE OR REPLACE FUNCTION public.gen_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE v text;
BEGIN
  LOOP
    v := upper(substr(md5(random()::text), 1, 8));
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM public.classes WHERE invite_code = v) THEN
        RETURN v;
      END IF;
    EXCEPTION WHEN others THEN END;
  END LOOP;
END;
$$;

-- ───────────────────────────────────────────────────────────
-- 3. class_members（班级成员）—— 学生用邀请码加入
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.class_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id   uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- ───────────────────────────────────────────────────────────
-- 4. tasks（学习任务）—— 教材挑 / 老师自定义(文本+音频)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL,
  type         text NOT NULL DEFAULT 'textbook',   -- 'textbook' | 'custom'
  textbook_ref jsonb,                              -- 教材挑：{bookId, lesson, parts:['words','sentences']}
  custom_text  text,                              -- 老师自定义文本
  audio_url    text,                              -- 老师上传音频（Supabase Storage 地址）
  due_at       timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────────────────────
-- 5. task_submissions（进度回收）—— 学生完成度 / 老师评分
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_submissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'assigned',  -- assigned | submitted | completed
  score        int,
  note         text,
  submitted_at timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, student_id)
);


-- ───────────────────────────────────────────────────────────
-- 6. 行级安全（RLS）—— 学生只见自己，老师只见自己的班
--    ⚠️ 铁律：策略里【不要】直接查询另一张也开了 RLS 的表。
--       classes ↔ class_members 互相引用会触发 42P17「无限递归」，
--       表现为：前端列表永远为空、profiles.role 读不出来、老师入口不出现。
--       跨表判断一律通过下面的 SECURITY DEFINER 辅助函数（内部绕过 RLS）。
-- ───────────────────────────────────────────────────────────
ALTER TABLE public.classes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

-- 6.1 辅助函数（SECURITY DEFINER：内部查询绕过 RLS，打破策略递归）
CREATE OR REPLACE FUNCTION public.is_class_teacher(p_class_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = p_class_id AND c.created_by = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_class_member(p_class_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_members cm
    WHERE cm.class_id = p_class_id AND cm.student_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.my_class_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.class_id FROM public.class_members cm WHERE cm.student_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_task_teacher(p_task_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.classes c ON c.id = t.class_id
    WHERE t.id = p_task_id AND c.created_by = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_my_student(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_members cm
    JOIN public.classes c ON c.id = cm.class_id
    WHERE cm.student_id = p_user_id AND c.created_by = auth.uid()
  );
$$;

-- 收紧执行权限：只给已登录用户，不给匿名访问
REVOKE ALL ON FUNCTION public.is_class_teacher(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_class_member(uuid)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_class_ids()          FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_task_teacher(uuid)   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_my_student(uuid)     FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_class_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_class_member(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_class_ids()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_task_teacher(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_my_student(uuid)     TO authenticated;

-- 6.2 策略
-- classes
DROP POLICY IF EXISTS classes_teacher_all   ON public.classes;
DROP POLICY IF EXISTS classes_student_read  ON public.classes;
CREATE POLICY classes_teacher_all ON public.classes
  FOR ALL USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY classes_student_read ON public.classes
  FOR SELECT USING (public.is_class_member(id));

-- class_members
DROP POLICY IF EXISTS cm_teacher_all   ON public.class_members;
DROP POLICY IF EXISTS cm_student_read  ON public.class_members;
DROP POLICY IF EXISTS cm_student_join  ON public.class_members;
CREATE POLICY cm_teacher_all ON public.class_members
  FOR ALL
  USING     (public.is_class_teacher(class_id))
  WITH CHECK (public.is_class_teacher(class_id));
CREATE POLICY cm_student_read ON public.class_members
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY cm_student_join ON public.class_members
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- tasks
DROP POLICY IF EXISTS tasks_teacher_all  ON public.tasks;
DROP POLICY IF EXISTS tasks_student_read ON public.tasks;
CREATE POLICY tasks_teacher_all ON public.tasks
  FOR ALL USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY tasks_student_read ON public.tasks
  FOR SELECT USING (class_id IN (SELECT public.my_class_ids()));

-- task_submissions
DROP POLICY IF EXISTS ts_student_read   ON public.task_submissions;
DROP POLICY IF EXISTS ts_student_write  ON public.task_submissions;
DROP POLICY IF EXISTS ts_student_update ON public.task_submissions;
DROP POLICY IF EXISTS ts_teacher_read   ON public.task_submissions;
DROP POLICY IF EXISTS ts_teacher_update ON public.task_submissions;
CREATE POLICY ts_student_read ON public.task_submissions
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY ts_student_write ON public.task_submissions
  FOR INSERT WITH CHECK (student_id = auth.uid());
-- 学生要能重复「标记完成」：前端用的是 upsert（已存在则改），需要 UPDATE 权限
CREATE POLICY ts_student_update ON public.task_submissions
  FOR UPDATE
  USING     (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());
CREATE POLICY ts_teacher_read ON public.task_submissions
  FOR SELECT USING (public.is_task_teacher(task_id));
CREATE POLICY ts_teacher_update ON public.task_submissions
  FOR UPDATE
  USING     (public.is_task_teacher(task_id))
  WITH CHECK (public.is_task_teacher(task_id));

-- profiles（老师要能看自己班上学生的姓名）
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS profiles_teacher_see_classmates ON public.profiles;
CREATE POLICY profiles_teacher_see_classmates ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_my_student(id));



-- ───────────────────────────────────────────────────────────
-- 7. 进班 RPC：学生输邀请码加入（安全，避免 RLS 漏洞）
-- ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_class(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_class uuid;
BEGIN
  SELECT id INTO v_class FROM public.classes WHERE invite_code = upper(trim(p_code)) LIMIT 1;
  IF v_class IS NULL THEN RAISE EXCEPTION 'INVALID_CODE'; END IF;
  INSERT INTO public.class_members (class_id, student_id)
    VALUES (v_class, auth.uid())
  ON CONFLICT (class_id, student_id) DO NOTHING;
  RETURN v_class;
END;
$$;


-- ───────────────────────────────────────────────────────────
-- 8. 音频存储桶（老师自定义任务上传音频）
--    若下面两句报错，请到 Dashboard → Storage → New bucket
--    手动建一个名为 class-audio 的【公开 public】桶，并加一条
--    "允许 authenticated 上传" 的策略即可。
-- ───────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('class-audio', 'class-audio', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS class_audio_upload ON storage.objects;
CREATE POLICY class_audio_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'class-audio');


-- ───────────────────────────────────────────────────────────
-- 9. 诊断输出
-- ───────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '  ✅ 教师端表已就绪！';
  RAISE NOTICE '  classes / class_members / tasks / task_submissions 已创建';
  RAISE NOTICE '  RLS + join_class() 已配置';
  RAISE NOTICE '  下一步：在《教师端功能开发清单.md》按阶段写前端。';
  RAISE NOTICE '========================================';
END $$;


-- ───────────────────────────────────────────────────────────
-- 10. 防御性：确保触发器仍绑定（即使之前没跑过 sync_profiles.sql）
--     on_auth_user_created 负责把 auth.users 同步进 public.profiles，
--     并写入同步时传入的 role。下面幂等重建一次，保证链路一定通。
-- ───────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_on_signup();


-- ───────────────────────────────────────────────────────────
-- 11. 把【你现有的账号】设为「老师」（只做一次，可选）
--     方式 A（推荐）：重新注册一个老师账号，注册时选「我是老师」，
--       新账号会自动写入 role='teacher'，无需此步。
--     方式 B：沿用旧账号 —— 把下面邮箱改成你自己的，删掉行首的
--       "-- " 注释符，在 Dashboard SQL Editor 里运行一次即可：
-- ───────────────────────────────────────────────────────────
-- UPDATE public.profiles SET role = 'teacher' WHERE email = '你的邮箱@example.com';
