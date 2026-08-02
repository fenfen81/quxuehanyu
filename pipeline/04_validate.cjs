#!/usr/bin/env node
// 04_validate.cjs — 校验 book.enriched.json 完整性
// 句子需 cn/en；生词需 hanzi/pinyin/english/exampleCn/exampleEn。
// dict 缺英文、生词缺 pos/examplePinyin 仅警告。
const fs = require('fs')
const path = require('path')
const BOOKS = path.join(__dirname, 'books')
const bookId = process.argv[2]
if (!bookId) { console.error('用法: node 04_validate.cjs <bookId>'); process.exit(1) }

const p = path.join(BOOKS, bookId, 'book.enriched.json')
if (!fs.existsSync(p)) { console.error('请先运行 03_enrich.cjs'); process.exit(1) }

const book = JSON.parse(fs.readFileSync(p, 'utf-8'))
const errs = [], warns = []
for (const lesson of book.lessons || []) {
  for (const text of lesson.texts || []) {
    for (const s of text.sentences || []) {
      if (!s.cn) errs.push(`句子缺 cn: ${s.id}`)
      if (!s.en) errs.push(`句子缺 en: ${s.id}`)
      if (!s.split) warns.push(`句子无分词(影响听写分段): ${s.id}`)
      if (s.dict) for (const [k, v] of Object.entries(s.dict)) if (!/\/.+/.test(v)) warns.push(`dict 缺英文: ${s.id} 词="${k}"`)
    }
  }
  for (const w of lesson.words || []) {
    if (!w.hanzi) errs.push(`生词缺 hanzi: ${w.id}`)
    if (!w.pinyin) errs.push(`生词缺 pinyin: ${w.id}`)
    if (!w.pos) warns.push(`生词缺 pos(词性): ${w.id}`)
    if (!w.english) errs.push(`生词缺 english: ${w.id}`)
    if (!w.exampleCn) errs.push(`生词缺 exampleCn: ${w.id}`)
    if (!w.exampleEn) errs.push(`生词缺 exampleEn: ${w.id}`)
    if (!w.examplePinyin) warns.push(`生词缺 examplePinyin: ${w.id}`)
  }
}
const nE = errs.length, nW = warns.length
console.log(`校验结果：${nE} 个错误 / ${nW} 个警告`)
errs.slice(0, 50).forEach((e) => console.log('  ✗', e))
warns.slice(0, 20).forEach((w) => console.log('  !', w))
if (nE) { console.error('存在错误，请修正 book.json 后重跑 enrich。'); process.exit(1) }
console.log('[validate] 通过')
