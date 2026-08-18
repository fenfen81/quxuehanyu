// 分段打字 / 听写时的「词段英文兜底词典」
// 背景：sentence.dict 只写了本课生词，很多常见词（书、买、去…）不在其中，
// 导致 ChunkedTypePractice 只能回退到整句英文。这里汇总 HSK 总词表 +
// 所有教材生词，作为全局兜底，让每个词段尽量显示自己的英文释义。

import { hskWords } from '@/data/hskWords'
import { getAllTextbookWords } from '@/data/textbookDict'

export interface Gloss {
  py: string
  en: string
}

// 模块级单例：只在首次 import 时构建一次
const glossMap: Map<string, Gloss> = (() => {
  const map = new Map<string, Gloss>()
  // HSK 总词表优先（释义更规范）
  for (const w of hskWords) {
    if (w.hanzi && w.english) {
      map.set(w.hanzi, { py: w.pinyin, en: w.english })
    }
  }
  // 教材生词补充（不覆盖已存在的 HSK 词条）
  for (const w of getAllTextbookWords()) {
    if (w.hanzi && w.english && !map.has(w.hanzi)) {
      map.set(w.hanzi, { py: w.pinyin, en: w.english })
    }
  }
  return map
})()

/** 查询某个词段的英文释义（全局词典兜底），查不到返回 null */
export function lookupGloss(chunk: string): Gloss | null {
  return glossMap.get(chunk) ?? null
}

export const chunkGlossSize = glossMap.size
