// ══════════════════════════════════════════════════════════════════════════════
//  i18n 翻译字典 — 中英双语
// ══════════════════════════════════════════════════════════════════════════════

export type Lang = 'zh' | 'en'

export const translations = {
  // ── 通用 ──
  back: { zh: '返回', en: 'Back' },
  home: { zh: '首页', en: 'Home' },
  settings: { zh: '设置', en: 'Settings' },
  confirm: { zh: '确认', en: 'Confirm' },
  reset: { zh: '重置', en: 'Reset' },
  close: { zh: '关闭', en: 'Close' },
  skip: { zh: '跳过', en: 'Skip' },
  search: { zh: '搜索', en: 'Search' },

  // ── 导航 ──
  nav_home: { zh: '主页', en: 'Home' },
  nav_words: { zh: '背单词', en: 'Vocabulary' },
  nav_practice: { zh: '课程练习', en: 'Practice' },
  nav_practice_short: { zh: '练习', en: 'Practice' },
  nav_words_short: { zh: '背词', en: 'Words' },

  // ── Hero ──
  hero_badge: { zh: '最有趣的汉语学习方式', en: 'The Fun Way to Learn Chinese' },
  hero_title: { zh: '像玩游戏一样学汉语', en: 'Learn Chinese Like a Game' },
  hero_tag1: { zh: '拖拽组句', en: 'Drag & Build' },
  hero_tag2: { zh: '听力听写', en: 'Dictation' },
  hero_tag3: { zh: '笔顺书写', en: 'Stroke Order' },
  hero_tag4: { zh: '背单词', en: 'Vocabulary' },
  hero_stat_done: { zh: '已完成句子', en: 'Sentences Done' },
  hero_stat_level: { zh: '当前等级', en: 'Level' },
  hero_stat_streak: { zh: '连击数', en: 'Streak' },
  hero_btn_practice: { zh: '开始练句子', en: 'Start Practice' },
  hero_btn_words: { zh: '背 HSK 单词', en: 'Study HSK Words' },

  // ── Feature Cards ──
  features_title: { zh: '五大核心功能', en: 'Five Core Features' },
  features_sub: { zh: '全方位训练汉语能力', en: 'Comprehensive Chinese Training' },
  feat_drag_title: { zh: '拖拽拼句', en: 'Drag Practice' },
  feat_drag_desc: { zh: '拖动词语拼成句子', en: 'Drag words to build sentences' },
  feat_type_title: { zh: '看英打中', en: 'EN→CN Typing' },
  feat_type_desc: { zh: '看英文写中文', en: 'Type Chinese from English' },
  feat_dict_title: { zh: '听力听写', en: 'Dictation' },
  feat_dict_desc: { zh: '听发音写汉字', en: 'Write what you hear' },
  feat_stroke_title: { zh: '笔顺书写', en: 'Stroke Order' },
  feat_stroke_desc: { zh: '学习正确笔顺', en: 'Learn correct strokes' },
  feat_vocab_title: { zh: '词卡背词', en: 'Flashcards' },
  feat_vocab_desc: { zh: 'HSK 1-6 词汇', en: 'HSK 1-6 Vocabulary' },

  // ── 学习数据看板 ──
  progress_title: { zh: '学习数据', en: 'My Progress' },
  progress_streak: { zh: '连击天数', en: 'Day Streak' },
  progress_xp: { zh: '累计 XP', en: 'Total XP' },
  progress_level: { zh: '当前等级', en: 'Level' },
  progress_done: { zh: '完成句子', en: 'Sentences Done' },
  progress_level_bar: { zh: '等级进度', en: 'Level Progress' },

  // ── 选择学习方向 ──
  choose_direction: { zh: '选择学习方向', en: 'Choose Your Path' },
  choose_direction_sub: { zh: '根据你的目标定制学习路径', en: 'Customize your learning journey' },

  // ── 分类描述 ──
  cat_comprehensive_desc: { zh: '系统学习听、说、读、写，全面提高汉语水平', en: 'Systematic training in listening, speaking, reading & writing' },
  cat_hsk_desc: { zh: '针对 HSK 各等级考试进行专项训练', en: 'Targeted prep for all HSK levels' },
  cat_oral_desc: { zh: '聚焦日常对话与口语表达，开口说汉语', en: 'Focus on daily conversation & speaking' },
  cat_vocational_desc: { zh: '结合职业场景学习专业汉语', en: 'Professional Chinese for career scenarios' },

  // ── 教材列表 ──
  no_textbooks: { zh: '该分类下暂无教材', en: 'No textbooks in this category' },
  more_coming: { zh: '更多教材正在准备中，敬请期待', en: 'More textbooks coming soon!' },
  lessons_unit: { zh: '课', en: 'lessons' },
  sentences_unit: { zh: '句', en: 'sentences' },
  level_beginner: { zh: '初级', en: 'Beginner' },
  level_intermediate: { zh: '中级', en: 'Intermediate' },
  level_advanced: { zh: '高级', en: 'Advanced' },

  // ── 模式切换 ──
  mode_drag: { zh: '拼句', en: 'Drag' },
  mode_type: { zh: '打字', en: 'Type' },
  mode_dictation: { zh: '听写', en: 'Dictation' },

  // ── 课文选择器 ──
  select_lesson: { zh: '选择课次', en: 'Select Lesson' },
  select_text: { zh: '选择课文', en: 'Select Text' },

  // ── 练习页 ──
  practice_play: { zh: '播放', en: 'Play' },
  practice_correct: { zh: '回答正确！', en: 'Correct!' },
  practice_wrong_answer: { zh: '正确答案', en: 'Correct answer' },
  practice_all_done: { zh: '全部完成！太棒了！', en: 'All done! Great job!' },
  practice_wrong_cleared: { zh: '错题全部搞定！', en: 'All wrong sentences cleared!' },
  practice_loading_audio: { zh: '语音加载中...', en: 'Loading audio...' },
  practice_select_lesson: { zh: '请先选择教材和课文', en: 'Select a lesson to begin' },
  practice_select_hint: { zh: '从上方选择课次和课文，开始练习之旅', en: 'Choose a lesson and text above to start' },
  practice_wrong_review: { zh: '错题复习', en: 'Wrong Review' },
  practice_exit_wrong: { zh: '退出错题', en: 'Exit' },
  practice_wrong_hint: { zh: '重做错题，答对后自动移出错题本', en: 'Redo wrong answers, auto-remove when correct' },
  practice_pass_count: { zh: '累计闯关', en: 'Total passes' },
  practice_times: { zh: '次', en: 'times' },
  practice_question: { zh: '题', en: 'Q' },
  practice_prev: { zh: '上一题', en: 'Previous' },
  practice_next: { zh: '下一题', en: 'Next' },
  practice_prev_wrong: { zh: '上一错题', en: 'Prev' },
  practice_next_wrong: { zh: '下一错题', en: 'Next' },
  practice_wrong_list: { zh: '查看我的错题', en: 'Wrong Sentences' },
  practice_wrong_count: { zh: '错题', en: 'Wrong' },

  // ── 拖拽练习 ──
  drag_words: { zh: '词语', en: 'Words' },
  drag_words_hint: { zh: '点击词语放入下方', en: 'Tap words to place below' },
  drag_words_hint_drag: { zh: '拖到下方组成句子', en: 'Drag words down to build sentence' },
  drag_all_used: { zh: '所有词语都已使用', en: 'All words used' },
  drag_answer: { zh: '答案', en: 'Answer' },
  drag_answer_hint: { zh: '点击移回 · 长按查笔顺', en: 'Tap to remove · Long-press for strokes' },
  drag_answer_hint_empty: { zh: '点击词语查看笔顺', en: 'Tap word for stroke order' },
  drag_placeholder: { zh: '点击上方词语组成句子', en: 'Tap words above to build sentence' },
  drag_placeholder_drag: { zh: '将上方词语拖到这里组成句子', en: 'Drag words here to build sentence' },
  drag_check: { zh: '核对答案', en: 'Check Answer' },

  // ── 打字练习 ──
  type_input_label: { zh: '中文输入', en: 'Chinese Input' },
  type_placeholder: { zh: '输入对应的中文句子...', en: 'Type the Chinese sentence...' },
  type_check: { zh: '核对答案', en: 'Check Answer' },

  // ── 听写练习 ──
  dict_play: { zh: '播放听力', en: 'Play Audio' },
  dict_played: { zh: '已播放', en: 'Played' },
  dict_times: { zh: '次', en: 'times' },
  dict_label: { zh: '默写', en: 'Write' },
  dict_placeholder: { zh: '听完后，在这里输入你听到的中文句子...', en: 'Type the Chinese sentence you hear...' },
  dict_check: { zh: '核对答案', en: 'Check Answer' },

  // ── 笔顺弹窗 ──
  popup_loading: { zh: '正在加载笔顺...', en: 'Loading strokes...' },
  popup_not_loaded: { zh: '笔顺引擎未加载', en: 'Stroke engine not loaded' },
  popup_refresh: { zh: '请刷新页面重试', en: 'Please refresh the page' },
  popup_no_hanzi: { zh: '该词语不包含汉字', en: 'No Chinese characters found' },
  popup_pinyin: { zh: '拼音', en: 'Pinyin' },
  popup_meaning: { zh: '释义', en: 'Meaning' },
  popup_play_stroke: { zh: '播放笔顺', en: 'Play Strokes' },
  popup_load_failed: { zh: '加载失败:', en: 'Load failed:' },
  popup_partial: { zh: '部分汉字笔顺加载成功', en: 'Some strokes loaded' },
  popup_all_failed: { zh: '所有汉字笔顺加载失败', en: 'All stroke loading failed' },

  // ── 背单词 ──
  words_title: { zh: '背单词', en: 'Vocabulary' },
  words_subtitle: { zh: 'HSK 1-6 级词汇', en: 'HSK 1-6 Word List' },
  words_fav: { zh: '收藏', en: 'Favorites' },
  words_settings: { zh: '练习设置', en: 'Practice Settings' },
  words_sfx: { zh: '键盘音效', en: 'Sound Effects' },
  words_autospeak: { zh: '自动朗读', en: 'Auto Speak' },
  words_search_placeholder: { zh: '搜索汉字、拼音或英文...', en: 'Search hanzi, pinyin or English...' },
  words_total_progress: { zh: '总学习进度', en: 'Total Progress' },
  words_daily_goal: { zh: '每日目标', en: 'Daily Goal' },
  words_today_learned: { zh: '今日已学', en: 'Today' },
  words_to_review: { zh: '待复习', en: 'To Review' },
  words_continue: { zh: '继续背词', en: 'Continue' },
  words_remaining: { zh: '今日还剩', en: 'remaining today' },
  words_words: { zh: '词', en: 'words' },
  words_learn_new: { zh: '学新词', en: 'New Words' },
  words_remaining_count: { zh: '剩余', en: 'Left' },
  words_review: { zh: '待复习', en: 'Review' },
  words_wrong_book: { zh: '错词本', en: 'Wrong Words' },
  words_wrong_count: { zh: '个错词', en: 'wrong' },
  words_review_all: { zh: '全部复习', en: 'Review All' },
  words_random_pick: { zh: '词随机抽', en: 'random' },
  words_type_practice: { zh: '打字练习', en: 'Typing' },
  words_type_desc: { zh: '看释义打汉字', en: 'Type from meaning' },
  words_wrong_practice: { zh: '错词专练', en: 'Wrong Practice' },
  words_wrong_practice_desc: { zh: '专项攻克错词', en: 'Focus on wrong words' },
  words_switch_level: { zh: '切换词库浏览：', en: 'Browse by level:' },
  words_estimated_finish: { zh: '完成', en: 'finish' },
  words_no_fav: { zh: '暂无收藏词汇', en: 'No favorites yet!' },
  words_no_review: { zh: '暂无待复习词汇', en: 'No words to review!' },
  words_no_wrong: { zh: '暂无错词，继续保持！', en: 'No wrong words. Keep going!' },
  words_wrong_book_hint: { zh: '答错的词自动收录，答对后可手动移除', en: 'Wrong answers auto-saved. Remove when mastered.' },
  words_wrong_words: { zh: '个错词', en: 'wrong words' },
  words_card: { zh: '词卡', en: 'Card' },
  words_quiz: { zh: '测验', en: 'Quiz' },
  words_type: { zh: '打字', en: 'Type' },
  words_auto_read: { zh: '自动读', en: 'Auto' },
  words_english_hint: { zh: '英文释义', en: 'English' },
  words_pinyin_hint: { zh: '拼音', en: 'Pinyin' },
  words_tap_flip: { zh: '点击翻转', en: 'Tap to flip' },
  words_prev_card: { zh: '上一个', en: 'Previous' },
  words_next_card: { zh: '下一个', en: 'Next' },
  words_complete: { zh: '完成', en: 'Done' },
  words_swipe_hint: { zh: '左右滑动切换词卡', en: 'Swipe to navigate' },
  words_select_correct: { zh: '选出正确的英文释义', en: 'Choose the correct meaning' },
  words_type_word: { zh: 'TYPE WORD', en: 'TYPE WORD' },
  words_try_again: { zh: 'TRY AGAIN', en: 'TRY AGAIN' },
  words_correct_excl: { zh: 'CORRECT!', en: 'CORRECT!' },
  words_type_confirm: { zh: '确认', en: 'Confirm' },
  words_type_correct: { zh: '太棒了！', en: 'Great!' },
  words_type_wrong: { zh: '正确答案是：', en: 'Correct answer:' },
  words_round_done: { zh: '本轮完成！', en: 'Round Complete!' },
  words_correct_count: { zh: '答对', en: 'Correct' },
  words_wrong_count_label: { zh: '答错', en: 'Wrong' },
  words_accuracy: { zh: '正确率', en: 'Accuracy' },
  words_again: { zh: '再来一轮', en: 'Again' },
  words_back_home: { zh: '回到首页', en: 'Back' },
  words_collapse: { zh: '收起', en: 'Collapse' },
  words_total_prefix: { zh: '共', en: 'Total' },
  words_est_prefix: { zh: '预计', en: 'Est.' },
  words_tap_speak: { zh: '点击朗读', en: 'Tap to speak' },
  words_remove_wrong: { zh: '移出错词本', en: 'Remove' },
  words_skip_hint: { zh: '跳过', en: 'Skip' },

  // ── 计划弹窗 ──
  plan_title: { zh: '修改计划', en: 'Edit Plan' },
  plan_subtitle: { zh: '设置你的每日挑战目标', en: 'Set your daily goal' },
  plan_daily_goal: { zh: '每日目标词数', en: 'Daily Word Goal' },
  plan_estimated: { zh: '预计学习周期', en: 'Estimated Duration' },
  plan_every_day: { zh: '每天', en: 'Every day' },
  plan_finish_in: { zh: '天学完', en: 'days to finish' },
  plan_save: { zh: '修改这份计划', en: 'Save Plan' },
  plan_words: { zh: '词', en: 'words' },

  // ── 底部 ──
  footer: { zh: '趣学汉语 © 2026 · 像玩游戏一样学汉语 · 让学习充满乐趣', en: 'QuXue Chinese © 2026 · Learn Chinese Like a Game · Make Learning Fun' },

  // ── 语言切换 ──
  lang_toggle: { zh: 'EN', en: '中' },

  // ── 背词模式选择 ──
  choose_vocab_mode: { zh: '选择背词模式', en: 'Choose Mode' },
  vocab_mode_hsk: { zh: 'HSK等级词汇', en: 'HSK Level Words' },
  vocab_mode_hsk_desc: { zh: 'HSK 1-6 标准词表，共5001词', en: 'HSK 1-6 standard vocabulary, 5001 words' },
  vocab_mode_textbook: { zh: '按教材背单词', en: 'By Textbook' },
  vocab_mode_textbook_desc: { zh: '按课本课次顺序学习生词', en: 'Learn vocabulary by textbook lesson' },
  vocab_back_mode: { zh: '选择模式', en: 'Mode' },
  vocab_tb_step_category: { zh: '分类', en: 'Category' },
  vocab_practice_btn: { zh: '📖 背本课生词', en: '📖 Lesson Vocab' },
  words_pinyin_toggle: { zh: '拼音', en: 'Pinyin' },
  words_pinyin_hidden: { zh: '点击显示拼音', en: 'Tap to reveal pinyin' },
  words_view_strokes: { zh: '查看笔顺', en: 'Stroke Order' },

  // ── 分段练习 ──
  practice_full_mode: { zh: '整句', en: 'Full' },
  practice_chunk_mode: { zh: '分段', en: 'Chunked' },
  chunk_step: { zh: '分段', en: 'Step' },
  chunk_show_en: { zh: '显示英文', en: 'Show EN' },
  chunk_hide_en: { zh: '隐藏英文', en: 'Hide EN' },
  chunk_correct_answer: { zh: '正确答案', en: 'Correct' },
  chunk_completed: { zh: '已完成段落', en: 'Completed' },
  chunk_final: { zh: '整句输入', en: 'Full Sentence' },
  chunk_hint: { zh: '分段提示', en: 'Chunks' },
  chunk_show_hint: { zh: '显示分段提示', en: 'Show Chunks' },
  chunk_hide_hint: { zh: '隐藏分段提示', en: 'Hide Chunks' },
  chunk_full_input: { zh: '输入完整句子', en: 'Type Full Sentence' },
  chunk_no_translation: { zh: '(无翻译)', en: '(N/A)' },
} as const

export type TranslationKey = keyof typeof translations

// ── 翻译函数 ──
export function t(key: TranslationKey, lang: Lang): string {
  const entry = translations[key]
  if (!entry) return key
  return entry[lang] || entry.zh || key
}
