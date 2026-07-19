// ══════════════════════════════════════════════════════════════════════════════
import { hskWords } from '../data/hskWords'

//  句子分段工具 — 对外汉语长难句切分（意群优先，复刻句游英语分段练习）
//  设计目标（HSK5 长难句专项增强）：
//    1) 语义第一：最小独立完整意群为切分单位，动宾/偏正/介宾/成语/惯用搭配不拆。
//    2) 分句优先：split 中含标点（，。；：）时，按标点把长句先断成若干分句。
//    3) 连接词独立：但/并且/因为/然而/于是/所以… 单独成碎片，给语序提示。
//    4) 长度均衡：杜绝单字孤立碎片（连接词除外）、杜绝超长十几字碎片；
//       短句(≤10字)不拆，中句(11–25字)3–5块，长复句(≥26字)5–8块。
//  兼容旧数据：split 无标点（HSK1-4）时退化为单分句，走短语规则+兜底。
// ══════════════════════════════════════════════════════════════════════════════

/** 标点符号 token（逗号/句号/分号/冒号/顿号等） */
const PUNCT = new Set(['。', '！', '？', '；', '…', '，', '、', '：', '“', '”', '‘', '’', '（', '）'])

/** 连接词 / 复句关联词：单独独立成碎片，给学习者语序提示 */
const CONJ = new Set([
  '但是', '但', '可是', '然而', '所以', '因此', '而且', '并且', '于是', '不过', '否则', '那么',
  '不如', '再说', '反之', '随后', '然后', '接着', '还是', '或者', '其实', '当然', '另外', '其实',
  '因为', '由于', '如果', '虽然', '只要', '只有', '不论', '无论', '为了', '除了', '即使', '虽说',
  '可是', '只是', '这样一来', '也就是说',
])

/** 单宾语介词（为/给/向/对/跟/从/比/往/朝…）：把"介词+宾语"收成一个碎片
 *  注意：叫/让/使 是使令动词（动词，非介词），不在此列，否则会误把主语切开 */
const PREP_SIMPLE = new Set([
  '为', '给', '向', '对', '跟', '从', '比', '往', '朝', '替', '由', '距', '离', '在', '到', '和', '与', '同',
])

/** 否定词 / 能愿动词：绑定其后动词不拆 */
const NEG = new Set(['不', '没', '没有', '别', '未', '无', '莫', '甭', '毫不', '决不', '并不'])
const MODAL = new Set([
  '想', '要', '会', '能', '能够', '可以', '应该', '应当', '肯', '敢', '得', '愿意', '喜欢',
  '希望', '打算', '准备', '决定', '开始', '继续', '试着',
])

/** "的" 后接这些词尾时不在此断开（保留完整短语） */
const DE_SUFFIX = new Set([
  '时候', '时候', '地方', '上', '里', '中', '前', '后', '时', '面', '边', '处', '间', '内', '外',
  '原因', '结果', '方法', '问题', '人', '东西', '事情', '情况', '国家', '学校', '公司', '医院',
  '城市', '生活', '工作', '程度', '方面', '部分', '点', '种', '个', '些', '家', '期', '性', '者',
  '话', '法', '力', '感', '儿',
])

const isHan = (s: string): boolean => /[一-鿿]/.test(s)
const hanLen = (s: string): number => (s.match(/[一-鿿]/g) || []).length

/** 碎片超长阈值：超过此中文字数的碎片视为"超长"，需在词中点兜底切分 */
const MAX_CHUNK = 13

/** 把一组词（可能含内部空格）合并成展示字符串 */
function joinWords(words: string[]): string {
  return words.join(' ').replace(/\s+/g, ' ').trim()
}

/** 规范化输入：移除空格、标点等非核心字符，仅保留汉字与字母数字，用于答案比对 */
export function normalizeText(s: string): string {
  return s.replace(/[^一-鿿a-zA-Z0-9]/g, '').toLowerCase()
}

/**
 * 短语级切分：对一个分句（无标点的词数组）进一步切成意群碎片。
 * 返回每个碎片（词间以空格连接）。
 */
function phraseChunk(words: string[], depth = 0): string[] {
  const clean = words.filter(Boolean)
  if (clean.length === 0) return []
  // 短分句（≤3词 或 ≤8字）整体不拆
  if (clean.length <= 3 || hanLen(clean.join('')) <= 8) {
    return [joinWords(clean)]
  }

  const chunks: string[] = []
  let cur: string[] = []
  let prepClose = false

  const flush = () => {
    if (cur.length) {
      chunks.push(joinWords(cur))
      cur = []
    }
  }

  for (let i = 0; i < clean.length; i++) {
    const w = clean[i]
    const next = clean[i + 1]

    // 上一轮开启了介词短语，当前词是介词宾语 → 收尾
    if (prepClose) {
      cur.push(w)
      flush()
      prepClose = false
      continue
    }

    // 连接词：前后都断开，单独成碎片
    if (CONJ.has(w)) {
      flush()
      chunks.push(w)
      continue
    }

    // 把 / 被 字句：把/被 前断开，把+宾语 收在一起（不在此断）
    if (w === '把' || w === '被') {
      flush()
      cur.push(w)
      continue
    }

    // 单宾语介词：介词前断开，介词+宾语 收成一个碎片
    if (PREP_SIMPLE.has(w)) {
      flush()
      cur.push(w)
      if (next) {
        cur.push(next)
        flush()
        i++
      }
      continue
    }

    // 否定 / 能愿 绑定其后动词：不在此断
    cur.push(w)

    // "的" 后断开（除非后接词尾，保留完整短语）
    if (w === '的' && cur.length >= 2) {
      if (!(next && DE_SUFFIX.has(next))) flush()
    }
    // "地" 后断开（状语独立）
    if (w === '地' && cur.length >= 2) {
      flush()
    }
  }
  flush()

  // 递归：超长碎片再切一刀（若已无法再分 / 达深度上限则保留，避免无限递归）
  const out: string[] = []
  for (const c of chunks) {
    if (hanLen(c) > MAX_CHUNK && depth < 4) {
      const sub = phraseChunk(c.split(' '), depth + 1)
      if (sub.length > 1) {
        out.push(...sub)
        continue
      }
      // 规则无法再切 → 在词中点强制均衡切开，杜绝超长碎片
      const words = c.split(' ')
      const cut = Math.max(1, Math.floor(words.length / 2))
      out.push(words.slice(0, cut).join(' '))
      out.push(words.slice(cut).join(' '))
      continue
    }
    out.push(c)
  }
  return out
}

/** 把单字孤立碎片（含连接词）并入相邻碎片，杜绝单字碎片 */
function mergeSingles(chunks: string[]): string[] {
  const merged: string[] = []
  let pending: string | null = null
  for (const c of chunks) {
    if (hanLen(c) === 1) {
      pending = pending ? `${pending} ${c}` : c
      continue
    }
    if (pending) {
      merged.push(`${pending} ${c}`)
      pending = null
    } else {
      merged.push(c)
    }
  }
  if (pending) {
    if (merged.length) merged[merged.length - 1] = `${merged[merged.length - 1]} ${pending}`
    else merged.push(pending)
  }
  return merged
}

/** 长度均衡：先合并单字碎片，再把仍超长的碎片兜底切，最后再合并一次 */
function balance(chunks: string[]): string[] {
  if (chunks.length <= 1) return chunks
  // 1) 先合并单字碎片（避免后续超长重切时把刚合并的单字又拆开）
  let cur = mergeSingles(chunks)
  // 2) 仍超长的碎片兜底再切
  const split: string[] = []
  for (const c of cur) {
    if (hanLen(c) > MAX_CHUNK) split.push(...phraseChunk(c.split(' ')))
    else split.push(c)
  }
  // 3) 兜底切可能产生新的单字碎片，再合并一次
  return mergeSingles(split)
}

/**
 * 主入口：把一句的 split 切成意群碎片数组。
 * @param _cn 原句（保留参数兼容，用于潜在 reg 提取）
 * @param split 空格分隔的词语（可含标点 token；HSK5 现已带回标点）
 */
export function chunkSentence(_cn: string, split: string): string[] {
  const raw = (split || '').split(/\s+/).filter(Boolean)
  if (raw.length === 0) return []

  // 短句（≤10字）整体不拆，即使含标点
  const noPunct = raw.filter((t) => !PUNCT.has(t))
  if (hanLen(noPunct.join('')) <= 10) {
    return [joinWords(noPunct)]
  }

  // 按标点把整句先断成若干分句
  const clauses: string[][] = []
  let cur: string[] = []
  for (const tok of raw) {
    if (PUNCT.has(tok)) {
      if (cur.length) {
        clauses.push(cur)
        cur = []
      }
      continue
    }
    cur.push(tok)
  }
  if (cur.length) clauses.push(cur)

  // 无标点（旧数据）：整句作为一个分句走短语规则 + 兜底
  if (clauses.length <= 1) {
    const single = phraseChunk(raw)
    return balance(single)
  }

  // 多分句：逐分句切分后拼接
  const result: string[] = []
  for (const cl of clauses) {
    if (cl.length === 0) continue
    result.push(...phraseChunk(cl))
  }
  return balance(result)
}

/** 兼容别名（音频生成脚本使用） */
export const chunkedSplit = chunkSentence

/**
 * 由 dict（词→"拼音 / 英文"）生成每个碎片的英文。
 * 优先级：dict 中的英文（/ 之后）> hskWords 词库英文；拼音-only 的词不计入（避免污染）。
 */
const HW_EN: Map<string, string> = new Map()
for (const w of hskWords) {
  const e = w.english || w.fullEnglish
  if (e) HW_EN.set(w.hanzi, e)
}

export function getChunkEns(chunks: string[], dict?: Record<string, string>): string[] {
  const res: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    const chParts = (chunks[i] || '').trim().split(/\s+/).filter(Boolean)
    const ens: string[] = []
    for (const p of chParts) {
      let e = ''
      const d = dict?.[p]
      if (d && d.includes('/')) e = d.split('/')[1].trim() // dict 格式：拼音 / 英文
      if (!e) e = HW_EN.get(p) || ''
      if (e) ens.push(e)
    }
    res.push(ens.join(' '))
  }
  return res
}

// 保留引用以避免 tree-shaking 误删（NEG/MODAL 在短语规则中作为"不拆"语义约束）
void isHan
void NEG
void MODAL
