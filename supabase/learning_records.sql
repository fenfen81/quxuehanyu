-- ============================================================
--  趣学汉语 · 学情明细表（learning_records）
--
--  目的：让学生每次完成「老师布置的任务」练习后，把真实学情上报云端，
--        老师端「进度」页就能看到 —— 谁练了、练了几个词、正确率多少、
--        具体错了哪些词、用了多久。
--
--  在【现有 Supabase 项目】上增量添加，全部 IF NOT EXISTS，可重复执行。
--  执行方法：Dashboard → SQL Editor → New query → 全选粘贴本文件 → Run
--            底部 Messages 出现 "✅ 学情明细表已就绪" 即成功。
--
--  ⚠️ 铁律：策略里【不要】直接查另一张也开了 RLS 的表，跨表判断一律走
--     SECURITY DEFINER 辅助函数，否则会触发 42P17「无限递归」。
-- ============================================================


-- ───────────────────────────────────────────────────────────
-- 1. 学情明细表
--    一次「完成一轮练习」= 一行；同一任务同一课重复练则覆盖最新一次。
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       uuid NOT NULL REFERENCES public.tasks(id)    ON DELETE CASCADE,
  class_id      uuid NOT NULL REFERENCES public.classes(id)   ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,

  kind          text NOT NULL DEFAULT 'vocab',   -- vocab（背生词）| sentences（课文句子）
  mode          text,                            -- flashcard（翻卡）| quiz（四选一）| type（打字）
  textbook_id   text NOT NULL DEFAULT '',
  lesson_id     text NOT NULL DEFAULT '',
  lesson_title  text,

  total         int  NOT NULL DEFAULT 0,   -- 本轮涉及多少个词
  viewed        int  NOT NULL DEFAULT 0,   -- 实际翻到/答到的数量
  correct       int  NOT NULL DEFAULT 0,   -- 答对
  wrong         int  NOT NULL DEFAULT 0,   -- 答错
  accuracy      numeric(5,2),              -- 正确率 %（翻卡模式无对错，为 null）

  wrong_words   jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{hanzi,pinyin,english}]
  learned_words jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration_sec  int   NOT NULL DEFAULT 0,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, student_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS learning_records_task_idx    ON public.learning_records (task_id);
CREATE INDEX IF NOT EXISTS learning_records_class_idx   ON public.learning_records (class_id);
CREATE INDEX IF NOT EXISTS learning_records_student_idx ON public.learning_records (student_id);


-- ───────────────────────────────────────────────────────────
-- 2. 辅助函数：当前学生是否属于「这个任务所在的班」
--    SECURITY DEFINER → 内部查询绕过 RLS，避免策略递归。
-- ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_task_in_my_class(p_task_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.class_members cm ON cm.class_id = t.class_id
    WHERE t.id = p_task_id AND cm.student_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_task_in_my_class(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_task_in_my_class(uuid) TO authenticated;


-- ───────────────────────────────────────────────────────────
-- 3. 行级安全（RLS）
-- ───────────────────────────────────────────────────────────
ALTER TABLE public.learning_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lr_student_read   ON public.learning_records;
DROP POLICY IF EXISTS lr_student_write  ON public.learning_records;
DROP POLICY IF EXISTS lr_student_update ON public.learning_records;
DROP POLICY IF EXISTS lr_teacher_read   ON public.learning_records;

-- 学生：只能看自己的学情
CREATE POLICY lr_student_read ON public.learning_records
  FOR SELECT USING (student_id = auth.uid());

-- 学生：只能为自己「所在班级的任务」上报（不能给别人、别的班刷数据）
CREATE POLICY lr_student_write ON public.learning_records
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
    AND public.is_task_in_my_class(task_id)
  );

-- 学生：重复练同一课要能覆盖（前端用 upsert，需 UPDATE 权限）
CREATE POLICY lr_student_update ON public.learning_records
  FOR UPDATE
  USING     (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid() AND public.is_task_in_my_class(task_id));

-- 老师：只能看自己班的任务学情
CREATE POLICY lr_teacher_read ON public.learning_records
  FOR SELECT USING (public.is_task_teacher(task_id));


-- ───────────────────────────────────────────────────────────
-- 4. 诊断输出
-- ───────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '  ✅ 学情明细表已就绪！';
  RAISE NOTICE '  learning_records（建表 + RLS + is_task_in_my_class）';
  RAISE NOTICE '  学生只能上报/读取自己的；老师只能读自己班的。';
  RAISE NOTICE '  下一步：前端会在学生完成练习时自动上报，无需再跑 SQL。';
  RAISE NOTICE '========================================';
END $$;
