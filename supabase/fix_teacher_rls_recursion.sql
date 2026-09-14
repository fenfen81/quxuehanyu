-- ============================================================
--  趣学汉语 · 修复：教师端 RLS 策略「无限递归」错误 (42P17)
-- ============================================================
--
--  【症状】前端读 profiles.role 报：
--      infinite recursion detected in policy for relation "class_members"
--    连带结果：
--      • 老师入口（📚 老师中心）永远不出现 —— 前端读不到 role，只能默认 student
--      • 我的班级 / 我的任务 永远是空列表 —— 查询被数据库直接拒绝
--      • 建班、发任务全部失败
--    （即使你的 UPDATE ... SET role='teacher' 已经跑成功了也没用，
--      因为前端根本读不出来。）
--
--  【原因】策略互相引用成了闭环：
--      classes 的策略  里 查 class_members
--      class_members 的策略 里 又查 classes
--      → Postgres 判定策略无限递归，直接拒绝所有相关查询。
--
--  【修法】把「跨表判断」搬进 SECURITY DEFINER 辅助函数。
--    这类函数以建表者身份执行，内部查询不触发 RLS，策略便不再互相套娃。
--
--  【安全说明】本文件只重建「行级安全策略」和几个只读辅助函数：
--    · 不删表、不删数据、不改任何字段内容
--    · 全部 IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS，可重复执行
--    · 权限没有被放宽：学生依然只能看自己，老师依然只能看自己的班
--
--  【执行方法】Supabase Dashboard → SQL Editor → New query
--    → 全选粘贴本文件 → Run → 底部 Results 会出现一张账号表。
-- ============================================================


-- ───────────────────────────────────────────────────────────
-- 1. 辅助函数（SECURITY DEFINER：内部查询绕过 RLS，打破策略递归）
-- ───────────────────────────────────────────────────────────

-- 我是不是这个班的老师？
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

-- 我是不是这个班的成员（学生）？
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

-- 我加入过的所有班级 id（供策略里 IN 使用）
CREATE OR REPLACE FUNCTION public.my_class_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.class_id FROM public.class_members cm WHERE cm.student_id = auth.uid();
$$;

-- 我是不是这条任务的出题老师？
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

-- 这个人是不是我班上（我教的）学生？
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


-- ───────────────────────────────────────────────────────────
-- 2. 重建策略（改掉互相引用的写法）
-- ───────────────────────────────────────────────────────────

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
-- 3. 自检 + 顺便确认「你的 role 到底改成功没有」
--    下面这张表会列出所有注册账号和它们的角色：
--      role 显示 teacher  → 账号是老师，刷新页面就能看到 📚 老师中心
--      role 显示 student  → 需要按第 4 节再改一次
--      显示 (无 profiles 行) → 这个账号还没有档案，见第 4 节方式 C
-- ───────────────────────────────────────────────────────────
SELECT
  u.email,
  COALESCE(p.role, '(无 profiles 行)') AS role,
  p.display_name,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC;


-- ───────────────────────────────────────────────────────────
-- 4. 把某个账号设为老师（按需，跑完上面那条确认后再说）
--    方式 A（最省事）：重新注册一个账号，注册页选「👩‍🏫 我是老师」。
--    方式 B：把下面邮箱换成上面表格里你的邮箱，去掉行首 "-- " 再跑一次。
--    方式 C（账号没有 profiles 行时用）：先补建档再设角色。
-- ───────────────────────────────────────────────────────────

-- 方式 B：
-- UPDATE public.profiles SET role = 'teacher', updated_at = now()
--  WHERE lower(email) = lower('你的邮箱@example.com');

-- 方式 C：
-- INSERT INTO public.profiles (id, email, full_name, phone, wants_paid, role, display_name, created_at, updated_at)
-- SELECT u.id, u.email, '', '', FALSE, 'teacher',
--        split_part(u.email, '@', 1), u.created_at, now()
--   FROM auth.users u
--  WHERE lower(u.email) = lower('你的邮箱@example.com')
-- ON CONFLICT (id) DO UPDATE
--   SET role = 'teacher', email = EXCLUDED.email, updated_at = now();
