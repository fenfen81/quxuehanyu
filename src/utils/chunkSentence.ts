// ══════════════════════════════════════════════════════════════════════════════
//  句子分段工具 — 对外汉语长难句切分（第一档：高可靠子集）
//  优先级（程序执行顺序）：
//    1级 强标点（。？！；…）整句分割
//    2级 复句关联词（但是/所以/因此/而且/并且/于是/不过/否则/那么/然而/不如/可是）
//    3级 句首条件/目的状语（虽然/因为/如果/为了/由于/除了 + 主语）
//    4级 多层“的”字定语（每个 ≥2 词的定语块断开）
//    5级 插入语（我觉得/说实话…）孤立成块
//    6级 把/被字句（把：主语+把+宾语成块；被：主语｜被+施动者成块）
//    弱标点（，、）：当前块 ≥6 字才断
//  禁止拆分保护：能愿/否定绑定、数量词、短句(≤4词/≤4字)整体
//  兜底：无标志的中等句（5~12词）用轻量“话题/伴随/副词/连动”规则
// ══════════════════════════════════════════════════════════════════════════════

/** 判断 token 是否为标点符号（纯标点 token 直接剔除） */
const isPunct = (t: string): boolean => /^[\p{P}\p{S}]+$/u.test(t)
const isStrong = (t: string): boolean => /[。？！；…．!?;]/.test(t)
const isWeak = (t: string): boolean => /[，、,:]/.test(t) && !isStrong(t)

// 2级 复句关联词（后半截，触发切分，标记归前半段）
const CONJ2 = new Set([
  '但是', '可是', '然而', '所以', '因此', '而且', '并且', '于是', '不过', '否则', '那么', '不如', '再说', '反之',
])
// 3级 句首条件/目的状语起始词
const FRONT = new Set([
  '虽然', '因为', '如果', '只有', '与其', '既然', '只要', '不论', '无论', '为了', '由于', '除了',
])
// 5级 插入语（孤立成块）
const INSERT = new Set([
  '我觉得', '说实话', '简单来说', '据说明', '总而言之', '也就是说', '要知道', '应该说', '老实说', '说真的',
  '依我看', '在我看来', '不可否认', '幸运的是', '遗憾的是', '重要的是', '奇怪的是', '一般来说', '事实上', '其实',
])
// 6级 把/被字句标志
const BA = new Set(['把', '被'])
// 主语代词（句首状语后切分点）
const SUBJECT = new Set([
  '我', '你', '他', '她', '它', '我们', '你们', '他们', '她们', '它们', '自己', '别人', '大家', '谁', '这', '那',
])
// 指示代词：开启新名词短语，在其前断开（这/那/这些/那些…）
const DEMO = new Set(['这', '那', '这些', '那些', '这个', '那个', '这儿', '那儿', '这里', '那里', '此'])
// “的”后接这些词尾时不切分（时候/地方/上/里… 与“的”组成完整方位/时间短语）
const DE_SUFFIX = new Set([
  '时候', '以后', '以前', '地方', '方面', '原因', '方式', '情况', '人', '东西', '事', '问题', '话', '处',
  '中', '上', '下', '里', '外', '边', '面', '后', '前', '间', '内', '者', '物', '儿', '方', '端',
])
// 能愿动词 / 否定词（绑定其后动词，不在此断开）
const NEG = new Set(['不', '没', '没有', '别', '莫'])
const NENGYUAN = new Set([
  '可以', '应该', '会', '能', '要', '想', '必须', '肯', '敢', '得', '愿意', '能够', '应当', '打算', '准备', '希望', '喜欢', '爱', '怕',
])
// 把/被 宾语结束后的谓语动词（遇到即开启新谓句块）
const PRED_VERB = new Set([
  '放', '送', '拿', '做', '读', '写', '看', '吃', '买', '去', '来', '回', '说', '叫', '让', '请', '要求', '认识', '是', '有',
  '带', '找', '帮', '告诉', '介绍', '给', '打', '开', '关', '走', '跑', '坐', '站', '唱', '听', '学', '教', '问', '答',
  '爱', '忘', '丢', '借', '还', '寄', '收', '穿', '戴', '用', '喝', '住', '玩', '等', '跟', '陪', '花', '搞', '变', '成',
  '进', '出', '过', '上', '下', '知道', '看见', '发现', '觉得', '希望', '开始', '继续', '决定', '选择', '参加', '帮助',
  '说明', '表示', '认为', '相信', '明白', '懂', '记得', '忘记', '欢迎', '邀请', '祝贺', '反对', '支持', '解决', '完成',
  '提高', '降低', '增加', '减少', '改变', '影响', '包括', '需要', '努力', '认真', '仔细',
])

// ── 兜底用的轻量规则 ──
const ADV = new Set([
  '一起', '都', '也', '就', '才', '还', '又', '再', '先', '常', '经常', '常常', '每天', '然后', '接着',
  '忽然', '慢慢', '马上', '正在', '已经', '刚才', '一直', '总是', '终于', '渐渐',
])
const COMIT = new Set(['和', '跟', '同', '与', '及'])
// 数词（含日期数字）
const NUM_WORDS = new Set([
  '零', '一', '二', '两', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九',
  '二十', '二十一', '二十二', '二十三', '二十四', '二十五', '二十六', '二十七', '二十八', '二十九',
  '三十', '三十一', '半', '几', '多少', '哪',
])
// 量词
const MEASURE = new Set([
  '个', '本', '只', '张', '把', '条', '件', '位', '名', '双', '对', '瓶', '杯', '碗', '盘', '棵', '颗', '朵',
  '头', '匹', '辆', '架', '艘', '间', '层', '页', '句', '首', '篇', '封', '场', '次', '回', '遍', '顿', '些',
  '种', '类', '点', '块', '片', '座', '根', '支', '枝', '台', '部', '套', '盒', '袋', '团', '群', '帮', '班',
  '伙', '列', '排', '行', '队', '串', '堆', '束', '番', '倍', '克', '公斤', '斤', '米', '厘米', '公里', '元',
  '毛', '分', '岁', '天', '年', '周', '星期', '礼拜', '日', '月', '号', '小时', '分钟', '点钟',
])
// 判断“号”是否构成日期单元（前面是“月”或数字）
const isDateHao = (cur: string[], w: string): boolean => {
  if (w !== '号') return false
  const last = cur[cur.length - 1]
  return last === '月' || NUM_WORDS.has(last)
}

/**
 * 将句子自动切分为语义语块
 * @param _cn   完整中文句子（保留参数兼容，主切分基于 split）
 * @param split 空格分隔的分词结果
 * @returns 语块数组，每块是空格分隔的词语
 */
export function chunkSentence(_cn: string, split: string): string[] {
  const raw = split.split(/\s+/).filter(Boolean)
  const toks: { t: string; strong: boolean; weak: boolean }[] = []
  for (const t of raw) {
    if (isPunct(t)) {
      toks.push({ t, strong: isStrong(t), weak: isWeak(t) })
    } else {
      toks.push({ t, strong: false, weak: false })
    }
  }

  const contentTokens = toks.filter(x => !x.strong && !x.weak).map(x => x.t)
  const contentCount = contentTokens.length
  // 短句（≤4 词）不分段，直接进入整句输入
  if (contentCount <= 4) return [contentTokens.join(' ')]

  const chunks: string[] = []
  let cur: string[] = []
  let curIsFront = false
  let baActive = false
  let baDeSeen = false

  const flush = () => {
    if (cur.length) {
      chunks.push(cur.join(' '))
      cur = []
    }
  }
  const clen = () => cur.join('').length

  for (let i = 0; i < toks.length; i++) {
    const x = toks[i]
    const w = x.t

    // 1级 强标点：断句并丢弃
    if (x.strong) {
      flush()
      continue
    }
    // 弱标点：当前块 ≥6 字才断，标点丢弃
    if (x.weak) {
      if (clen() >= 6) flush()
      continue
    }

    // 能愿/否定绑定：不在此前断开
    const prev = cur[cur.length - 1]
    let breakBefore = false
    if (cur.length > 0) {
      if (CONJ2.has(w)) breakBefore = true
      if (INSERT.has(w)) breakBefore = true
      if (w === '被') breakBefore = true // 被字句：主语｜被+施动者
      if (curIsFront && SUBJECT.has(w)) breakBefore = true // 句首状语结束于主语
      if (baActive && baDeSeen && PRED_VERB.has(w)) breakBefore = true // 把/被 宾语后的谓语
      // 指示代词开启新名词短语（不在句首状语刚起头时断）
      if (DEMO.has(w) && !(curIsFront && cur.length === 1)) breakBefore = true
      if (prev && (NEG.has(prev) || NENGYUAN.has(prev))) breakBefore = false
    }
    if (breakBefore) flush()

    if (cur.length === 0 && FRONT.has(w)) curIsFront = true
    cur.push(w)
    if (BA.has(w)) {
      baActive = true
      baDeSeen = false
    }
    if (w === '的' && baActive) baDeSeen = true

    // 在 把/被 作用域内不切“的”（把/被 宾语整体成块）
    let breakAfter = false
    if (INSERT.has(w)) breakAfter = true
    const nextTok = toks[i + 1]
    const deNoSplit = w === '的' && nextTok && DE_SUFFIX.has(nextTok.t)
    if (!baActive && !deNoSplit && (w === '的' || w === '地') && cur.length >= 3) breakAfter = true
    if (breakAfter) flush()
  }
  flush()

  // 兜底：无标志的中等句（主规则未产生切分），用轻量“话题/伴随/副词/连动”规则
  if (chunks.length <= 1 && contentCount >= 5 && contentCount <= 12) {
    return fallbackChunk(contentTokens)
  }
  return chunks
}

/** 轻量兜底：话题块 / 伴随词向前贴 / 副词独立 / 连动另起 / 数量词绑定 / 日期号单元 / 量词后名词短语 */
function fallbackChunk(words: string[]): string[] {
  const chunks: string[] = []
  let cur: string[] = []
  let forceBreakNext = false
  let nounPhrase = false
  const flush = () => {
    if (cur.length) {
      chunks.push(cur.join(' '))
      cur = []
      nounPhrase = false
    }
  }
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    let b = false
    if (forceBreakNext) {
      b = true
      forceBreakNext = false
    } else if (cur.length > 0) {
      if (COMIT.has(w)) b = true
      else if (ADV.has(w)) b = true
      else if (isDateHao(cur, w)) b = false
      else if (MEASURE.has(w) && NUM_WORDS.has(cur[cur.length - 1])) b = false
      else if (nounPhrase) b = false
      // 连动：块尾已有 2 个连续实词且本词也是实词 → 另起一块
      else if (
        cur.length >= 2 &&
        !NEG.has(cur[cur.length - 1]) && !NENGYUAN.has(cur[cur.length - 1]) &&
        !NEG.has(cur[cur.length - 2]) && !NENGYUAN.has(cur[cur.length - 2]) &&
        !COMIT.has(cur[cur.length - 1]) && !COMIT.has(cur[cur.length - 2]) &&
        !ADV.has(cur[cur.length - 1]) && !ADV.has(cur[cur.length - 2])
      ) {
        b = true
      }
    }
    if (b) flush()
    const prevTok = cur[cur.length - 1]
    cur.push(w)
    // 日期“号”单元后，下一块强制断开
    if (w === '号' && (prevTok === '月' || NUM_WORDS.has(prevTok))) forceBreakNext = true
    // 量词后接非动词/非功能词 → 进入名词短语（量词+名词整体成块）；日期“号”除外
    if (MEASURE.has(w) && w !== '号') {
      const nx = words[i + 1]
      if (
        nx && !PRED_VERB.has(nx) && !ADV.has(nx) && !CONJ2.has(nx) &&
        !NEG.has(nx) && !NENGYUAN.has(nx) && !COMIT.has(nx) &&
        !SUBJECT.has(nx) && !DEMO.has(nx)
      ) {
        nounPhrase = true
      }
    }
  }
  flush()
  return chunks
}

/**
 * 根据 dict 字段，为每个语块生成英文翻译
 * @param chunks 语块数组
 * @param dict   词语字典 { word: "pinyin / english" }
 * @returns 每个语块对应的英文翻译
 */
export function getChunkEns(chunks: string[], dict: Record<string, string>): string[] {
  return chunks.map(chunk => {
    const words = chunk.split(/\s+/).filter(Boolean)
    const ens = words
      .map(word => {
        const entry = dict[word]
        if (!entry) return ''
        const parts = entry.split(' / ')
        const english = parts[1] || ''
        return english.split(/[,;]/)[0].trim()
      })
      .filter(Boolean)
    return ens.join(' ')
  })
}

/** 标准化文本用于比较（去标点、去空格） */
export function normalizeText(s: string): string {
  return s.replace(/[。？！，、；：\s]/g, '')
}
