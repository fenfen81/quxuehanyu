// ══════════════════════════════════════════════════════════════════════════════
//  教材生词索引 — 跨教材查词
//  把全部教材词条按「词形」聚合：同一个词可能出现在多本教材的多个课次里
//  （实测 8 本教材 3234 词条 / 2276 词形，其中 723 个词形跨教材重复，
//   如「了」出现在 6 本教材的 7 个课次）—— 这正是本模块存在的意义。
// ══════════════════════════════════════════════════════════════════════════════

import { textbookVocabList } from '../data/textbookDict'
import type { TextbookWord, LessonVocab, TextbookVocab } from '../data/textbookDict'

/** 一个词在「某本教材 · 某一课」中的一次出现 */
export interface TbOccurrence {
  wordId: string
  textbookId: string
  textbookTitle: string
  textbookTitleEn: string
  lessonId: string
  lessonNum: number
  lessonTitle: string
  lessonTitleEn: string
  pinyin: string
  pos: string
  english: string
  exampleCn: string
  exampleEn: string
  examplePinyin?: string
}

/** 按词形聚合后的查词结果：一个词形 + 它出现过的所有位置 */
export interface TbWordHit {
  hanzi: string
  occurrences: TbOccurrence[]
}

// ── 拼音去声调：hǎo → hao，便于用拉丁字母搜索 ──
const TONE_MAP: Record<string, string> = {
  'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
  'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
  'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
  'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
  'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
  'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v', 'ü': 'v',
}

export function normalizePinyin(s: string): string {
  return s
    .toLowerCase()
    .replace(/[āáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜü]/g, (c) => TONE_MAP[c] ?? c)
    .replace(/\s+/g, '')
}

// ══════════════════════════════════════════════════════════════════════════════
//  建索引（模块首次加载时执行一次）
// ══════════════════════════════════════════════════════════════════════════════
const wordIndex = new Map<string, TbOccurrence[]>()
let entryCount = 0

for (const tb of textbookVocabList) {
  for (const lesson of tb.lessons) {
    for (const w of lesson.words) {
      const occ: TbOccurrence = {
        wordId: w.id,
        textbookId: tb.textbookId,
        textbookTitle: tb.title,
        textbookTitleEn: tb.titleEn,
        lessonId: lesson.lessonId,
        lessonNum: lesson.lessonNum,
        lessonTitle: lesson.lessonTitle,
        lessonTitleEn: lesson.lessonTitleEn,
        pinyin: w.pinyin,
        pos: w.pos,
        english: w.english,
        exampleCn: w.exampleCn,
        exampleEn: w.exampleEn,
        examplePinyin: w.examplePinyin,
      }
      const list = wordIndex.get(w.hanzi)
      if (list) list.push(occ)
      else wordIndex.set(w.hanzi, [occ])
      entryCount++
    }
  }
}

/** 全部词条数（含重复词形） */
export const tbEntryCount = entryCount
/** 去重后的词形数 */
export const tbUniqueWordCount = wordIndex.size

// ══════════════════════════════════════════════════════════════════════════════
//  查词
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 教材生词搜索：支持汉字、拼音（可不带声调）、英文释义三种方式。
 * 返回按词形聚合的结果，每个词形带它出现过的所有教材/课次。
 */
export function searchTextbookWords(q: string, limit = 12): TbWordHit[] {
  const query = q.trim().toLowerCase()
  if (!query) return []
  const qn = normalizePinyin(query)

  const scored: Array<{ hanzi: string; occurrences: TbOccurrence[]; rank: number }> = []

  for (const [hanzi, occurrences] of wordIndex) {
    let rank = -1
    if (hanzi === query) rank = 0
    else if (hanzi.startsWith(query)) rank = 1
    else if (hanzi.includes(query)) rank = 2

    if (rank < 0) {
      // 拼音匹配（去声调后比较，也兼容直接输入带声调拼音）
      const pyHit = occurrences.some(
        (o) =>
          normalizePinyin(o.pinyin).includes(qn) ||
          normalizePinyin(o.pinyin).startsWith(qn),
      )
      // 英文释义匹配（至少 2 个字符，避免单个字母噪声）
      const enHit = query.length >= 2 && occurrences.some((o) => o.english.toLowerCase().includes(query))

      if (pyHit) rank = 3
      else if (enHit) rank = 4
    }

    if (rank >= 0) scored.push({ hanzi, occurrences, rank })
  }

  scored.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.hanzi.length - b.hanzi.length ||
      b.occurrences.length - a.occurrences.length ||
      a.hanzi.localeCompare(b.hanzi, 'zh-Hans-CN'),
  )

  return scored.slice(0, limit).map(({ hanzi, occurrences }) => ({ hanzi, occurrences }))
}

/** 取某个词形的全部出现位置（用于详情弹窗） */
export function getWordOccurrences(hanzi: string): TbOccurrence[] {
  return wordIndex.get(hanzi) ?? []
}

/** 取某本教材某一课的课次信息 */
export function getLessonInfo(
  textbookId: string,
  lessonId: string,
): { textbook: TextbookVocab; lesson: LessonVocab } | null {
  const textbook = textbookVocabList.find((t) => t.textbookId === textbookId)
  if (!textbook) return null
  const lesson = textbook.lessons.find((l) => l.lessonId === lessonId)
  if (!lesson) return null
  return { textbook, lesson }
}

/** 取某本教材某一课的全部生词 */
export function getLessonWords(textbookId: string, lessonId: string): TextbookWord[] {
  return getLessonInfo(textbookId, lessonId)?.lesson.words ?? []
}

export interface TextbookStats {
  /** 课数 */
  lessonCount: number
  /** 词条总数（含重复词形） */
  entryCount: number
  /** 去重后的词形数 */
  uniqueCount: number
  /** 在其他课/其他教材也出现过的词条数 */
  repeatEntryCount: number
  /** 在其他课/其他教材也出现过的词形数 */
  repeatFormCount: number
}

/** 整本教材的收词统计（研究者视角：收词量 / 去重词形 / 与他处重复情况） */
export function getTextbookStats(textbookId: string): TextbookStats | null {
  const tb = textbookVocabList.find((t) => t.textbookId === textbookId)
  if (!tb) return null
  let entryCount = 0
  let repeatEntryCount = 0
  const forms = new Set<string>()
  const repeatForms = new Set<string>()
  for (const lesson of tb.lessons) {
    for (const w of lesson.words) {
      entryCount++
      forms.add(w.hanzi)
      const occ = wordIndex.get(w.hanzi)
      if (occ && occ.length > 1) {
        repeatEntryCount++
        repeatForms.add(w.hanzi)
      }
    }
  }
  return {
    lessonCount: tb.lessons.length,
    entryCount,
    uniqueCount: forms.size,
    repeatEntryCount,
    repeatFormCount: repeatForms.size,
  }
}
