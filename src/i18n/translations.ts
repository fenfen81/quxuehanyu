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
  words_example_pinyin_toggle: { zh: '例句拼音', en: 'Ex. Pinyin' },
  words_example_audio_toggle: { zh: '自动读例句', en: 'Auto ex.' },
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

  // ── 句子练习设置面板 ──
  settings_title: { zh: '练习设置', en: 'Practice Settings' },
  settings_font_size: { zh: '字体大小', en: 'Font Size' },
  settings_font_small: { zh: '小', en: 'Small' },
  settings_font_medium: { zh: '中', en: 'Medium' },
  settings_font_large: { zh: '大', en: 'Large' },
  settings_font_xl: { zh: '特大', en: 'X-Large' },
  settings_font_xxl: { zh: '超大', en: 'XX-Large' },
  settings_audio_speed: { zh: '音频速度', en: 'Audio Speed' },
  settings_auto_play: { zh: '自动播放次数', en: 'Auto-play Times' },
  settings_auto_manual: { zh: '手动', en: 'Manual' },
  settings_keyboard_sound: { zh: '键盘音效', en: 'Key Sound' },
  settings_theme: { zh: '显示风格', en: 'Theme' },
  settings_theme_blue: { zh: '浅蓝', en: 'Light Blue' },
  settings_theme_white: { zh: '纯白', en: 'White' },
  settings_theme_gray: { zh: '浅灰', en: 'Light Gray' },
  settings_theme_dark: { zh: '深色', en: 'Dark' },
  settings_on: { zh: '开', en: 'On' },
  settings_off: { zh: '关', en: 'Off' },

  // ── 积分系统 ──
  nav_profile: { zh: '个人中心', en: 'My Center' },
  credits_balance: { zh: '我的积分', en: 'My Credits' },
  credits_spend_hint: { zh: '每次开始练习消耗 20 积分', en: '20 credits per practice session' },
  credits_claim_daily: { zh: '每日登录领积分', en: 'Claim daily bonus' },
  credits_claimed_today: { zh: '今日已领取', en: 'Claimed today' },
  credits_claim_success: { zh: '领取成功', en: 'Claimed' },
  credits_already_claimed: { zh: '今天已经领过啦，明天再来', en: 'Already claimed today — come back tomorrow' },
  credits_go_survey: { zh: '完成问卷得积分', en: 'Complete the survey' },
  credits_go_profile: { zh: '去个人中心', en: 'Go to My Center' },
  credits_copy: { zh: '复制', en: 'Copy' },
  credits_copied: { zh: '已复制', en: 'Copied' },
  credits_history: { zh: '积分流水', en: 'Credit History' },
  credits_no_history: { zh: '暂无积分记录，快去学习或做问卷吧！', en: 'No records yet — go practice or take the survey!' },
  credits_insufficient: { zh: '积分不足', en: 'Not enough credits' },

  // ── 付费墙 ──
  paywall_title: { zh: '积分不足，学不了啦 😅', en: 'Out of credits 😅' },
  paywall_desc: { zh: '完成问卷或每天登录都能免费获得积分，继续学习！', en: 'Earn free credits by taking the survey or logging in daily!' },
  paywall_survey_hint: { zh: '12 题 · 2 分钟 · 一次性奖励', en: '12 questions · 2 min · one-time' },
  paywall_profile_hint: { zh: '每日领取 · 复制邀请码', en: 'Daily claim · invite friends' },
  paywall_retry: { zh: '稍后再试', en: 'Not now' },

  // ── 个人中心 ──
  profile_title: { zh: '个人中心', en: 'My Center' },
  profile_invite_title: { zh: '邀请好友，双方得积分', en: 'Invite friends & earn credits' },
  profile_invite_desc: { zh: '分享你的邀请码，好友注册后你得 100 积分', en: 'Share your code — earn 100 credits per sign-up' },
  profile_invite_reward: { zh: '好友注册成功后，你将获得 +100 积分', en: 'You get +100 credits when a friend signs up' },
  profile_invite_loading: { zh: '邀请码生成中…', en: 'Loading your code…' },
  profile_survey_title: { zh: '体验问卷', en: 'Feedback Survey' },
  profile_survey_desc: { zh: '帮我们做得更好，还有积分奖励', en: 'Help us improve & earn credits' },
  profile_survey_btn: { zh: '填写问卷', en: 'Take the survey' },
  profile_survey_done: { zh: '问卷已填写', en: 'Survey completed' },
  profile_back_home: { zh: '返回首页继续学习', en: 'Back to learning' },

  // ── 积分流水原因 ──
  tx_signup: { zh: '注册奖励', en: 'Sign-up bonus' },
  tx_daily: { zh: '每日登录奖励', en: 'Daily login' },
  tx_survey: { zh: '问卷奖励', en: 'Survey reward' },
  tx_referral: { zh: '推荐奖励', en: 'Referral reward' },
  tx_spend: { zh: '练习消耗', en: 'Practice cost' },

  // ── 顶栏用户气泡 / 赚积分 / 低余额提醒 ──
  um_signed_in_as: { zh: '当前登录', en: 'Signed in as' },
  logout: { zh: '退出登录', en: 'Log out' },
  earn_title: { zh: '赚积分', en: 'Earn credits' },
  earn_subtitle: { zh: '3 种方式快速补充', en: '3 quick ways to top up' },
  earn_daily_title: { zh: '每日登录', en: 'Daily login' },
  earn_daily_desc: { zh: '每天自动到账 +100 积分', en: 'Get +100 credits every day' },
  earn_daily_cta: { zh: '去领取', en: 'Claim' },
  earn_survey_title: { zh: '填写体验问卷', en: 'Feedback survey' },
  earn_survey_desc: { zh: '12 题 · 2 分钟 · 一次性 +200', en: '12 questions · 2 min · one-time +200' },
  earn_survey_cta: { zh: '去填写', en: 'Take it' },
  earn_referral_title: { zh: '推荐同学', en: 'Refer a friend' },
  earn_referral_desc: { zh: 'TA 注册后你自动到账 +100', en: '+100 credits when they sign up' },
  toast_warn_title: { zh: '积分快用完啦（剩 N 分）', en: 'Credits running low (N left)' },
  toast_warn_desc: { zh: '做问卷 +200 · 每日登录 +100 · 推荐同学 +100', en: 'Survey +200 · Daily +100 · Refer +100' },
  toast_critical_title: { zh: '只剩 N 积分了', en: 'Only N credits left' },
  toast_critical_desc: { zh: '快去赚积分，别让学习中断', en: 'Earn more to keep learning' },
  toast_cta: { zh: '去赚', en: 'Earn now' },
} as const

export type TranslationKey = keyof typeof translations

// ── 翻译函数 ──
export function t(key: TranslationKey, lang: Lang): string {
  const entry = translations[key]
  if (!entry) return key
  return entry[lang] || entry.zh || key
}
