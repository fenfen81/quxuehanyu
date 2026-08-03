#!/usr/bin/env node
// 05_emit.cjs — 把 book.enriched.json 写入 content.ts(课文) 与 textbookDict.ts(生词)
// 采用括号匹配精准插入，绝不整体覆盖，已有机教材（如 1a）不受影响。
//   --dry-run  只生成预览 emit.preview.ts，不改任何文件
//   --force    若已导入则先删除旧块再插入
const fs = require('fs')
const path = require('path')

const ROOT = process.env.EMIT_ROOT ? path.resolve(process.env.EMIT_ROOT) : path.join(__dirname, '..')
const CONTENT = path.join(ROOT, 'src', 'data', 'content.ts')
const DICT = path.join(ROOT, 'src', 'data', 'textbookDict.ts')

// 注：book 的加载与 argv 解析放在 require.main 块内，便于本模块被其他脚本 require 复用，
// 而不会因为缺少 argv 而 process.exit(1)。

// 同时转义反斜杠、双引号、单引号与换行，确保字段值无论包在单/双引号里都安全
function esc(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/\n/g, '\\n') }

// ── content.ts 课文字面量（嵌套对象不自带结尾逗号，由父级 join 添加；顶层对象带逗号）──
function genSentence(s, ind) {
  const sp = ' '.repeat(ind), sp2 = ' '.repeat(ind + 2), sp3 = ' '.repeat(ind + 4)
  let dictStr = ''
  if (s.dict && Object.keys(s.dict).length) {
    const lines = Object.entries(s.dict).map(([k, v]) => `${sp3}"${esc(k)}": "${esc(v)}",`)
    dictStr = `\n${sp2}dict: {\n${lines.join('\n')}\n${sp2}}`
  }
  return `${sp}{\n${sp2}id: '${esc(s.id)}',\n${sp2}cn: "${esc(s.cn)}",\n${sp2}split: "${esc(s.split)}",\n${sp2}en: "${esc(s.en)}",${dictStr}\n${sp}}`
}
function genText(t, ind) {
  const sp = ' '.repeat(ind)
  const ss = (t.sentences || []).map((s) => genSentence(s, ind + 4)).join(',\n')
  return `${sp}{\n${sp}  id: '${esc(t.id)}',\n${sp}  label: "${esc(t.label || '')}",\n${sp}  sentences: [\n${ss}\n${sp}  ]\n${sp}}`
}
function genContentLesson(L, ind) {
  const sp = ' '.repeat(ind)
  const ts = (L.texts || []).map((t) => genText(t, ind + 4)).join(',\n')
  const title = L.lessonTitle || `第${(L.lessonNum || 0)}课`
  return `${sp}{\n${sp}  id: '${esc(L.lessonId || ('lesson' + (L.lessonNum || '')))}',\n${sp}  title: '${esc(title)}',\n${sp}  titleEn: '${esc('Lesson ' + (L.lessonNum || ''))}',\n${sp}  texts: [\n${ts}\n${sp}  ]\n${sp}}`
}
function genTextbook(b, ind) {
  const sp = ' '.repeat(ind)
  const ls = (b.lessons || []).map((L) => genContentLesson(L, ind + 4)).join(',\n')
  return `${sp}{\n${sp}  id: '${esc(b.textbookId)}',\n${sp}  categoryId: '${esc(b.categoryId || 'comprehensive')}',\n${sp}  title: "${esc(b.title)}",\n${sp}  titleEn: "${esc(b.titleEn || '')}",\n${sp}  level: '${esc(b.level || '初级')}',\n${sp}  lessons: [\n${ls}\n${sp}  ]\n${sp}}` // 不带尾逗号（insertIntoArray 会自动加前导逗号）
}

// ── textbookDict.ts 生词字面量 ──
function genDictWord(w, ind) {
  const sp = ' '.repeat(ind)
  return `${sp}{\n${sp}  id: '${esc(w.id)}',\n${sp}  hanzi: '${esc(w.hanzi)}',\n${sp}  pinyin: '${esc(w.pinyin)}',\n${sp}  pos: '${esc(w.pos || '')}',\n${sp}  english: '${esc(w.english)}',\n${sp}  exampleCn: '${esc(w.exampleCn)}',\n${sp}  exampleEn: '${esc(w.exampleEn)}',\n${sp}  examplePinyin: '${esc(w.examplePinyin || '')}'\n${sp}}`
}
function genDictLesson(L, ind) {
  const sp = ' '.repeat(ind)
  const ws = (L.words || []).map((w) => genDictWord(w, ind + 4)).join(',\n')
  return `${sp}{\n${sp}  lessonId: '${esc(L.lessonId || ('lesson' + (L.lessonNum || '')))}',\n${sp}  lessonNum: ${L.lessonNum || 0},\n${sp}  lessonTitle: '${esc(L.lessonTitle || '')}',\n${sp}  lessonTitleEn: '${esc(L.lessonTitleEn || ('Lesson ' + (L.lessonNum || '')))}',\n${sp}  words: [\n${ws}\n${sp}  ]\n${sp}}`
}
function genVocab(b, ind) {
  const sp = ' '.repeat(ind)
  const ls = (b.lessons || []).map((L) => genDictLesson(L, ind + 4)).join(',\n')
  return `${sp}{\n${sp}  textbookId: '${esc(b.textbookId)}',\n${sp}  title: '${esc(b.title)}',\n${sp}  titleEn: '${esc(b.titleEn || '')}',\n${sp}  categoryId: '${esc(b.categoryId || 'comprehensive')}',\n${sp}  lessons: [\n${ls}\n${sp}  ]\n${sp}}` // 不带尾逗号（insertIntoArray 会自动加前导逗号）
}

// ── 括号匹配插入 / 删除 ──
// 字符串/注释感知的括号扫描（content.ts 的句子文本里可能含 [ ] 等字符）
function findMatchingClose(content, marker) {
  const start = content.indexOf(marker)
  if (start < 0) return -1
  let depth = 0
  let i = start + marker.length - 1 // marker 末尾的 '[' 是数组开始
  let inStr = null
  for (; i < content.length; i++) {
    const ch = content[i]
    if (inStr) { if (ch === '\\') { i++; continue } if (ch === inStr) inStr = null; continue }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue }
    if (ch === '/' && content[i + 1] === '/') { while (i < content.length && content[i] !== '\n') i++; continue }
    if (ch === '/' && content[i + 1] === '*') { i += 2; while (i < content.length && !(content[i] === '*' && content[i + 1] === '/')) i++; continue }
    if (ch === '[') depth++
    else if (ch === ']') { depth--; if (depth === 0) return i }
  }
  return -1
}
function skipStrings(content, i, end, inStr) {
  const ch = content[i]
  if (inStr) { if (ch === '\\') return { next: i + 1, inStr }; if (ch === inStr) return { next: i + 1, inStr: null }; return { next: i + 1, inStr } }
  if (ch === '"' || ch === "'" || ch === '`') return { next: i + 1, inStr: ch }
  if (ch === '/' && content[i + 1] === '/') { let j = i; while (j < end && content[j] !== '\n') j++; return { next: j, inStr: null } }
  if (ch === '/' && content[i + 1] === '*') { let j = i + 2; while (j < end && !(content[j] === '*' && content[j + 1] === '/')) j++; return { next: j + 1, inStr: null } }
  return { next: i + 1, inStr: null }
}
function insertIntoArray(content, marker, literal) {
  const closeIdx = findMatchingClose(content, marker)
  if (closeIdx < 0) throw new Error('找不到数组结束: ' + marker)
  const before = content.slice(0, closeIdx)
  const after = content.slice(closeIdx)
  let trimmed = before.replace(/\s+$/, '')
  // 去掉末尾可能已有的逗号，避免与下方前导逗号叠加成 },,（TS1005 / undefined 元素）
  if (trimmed.endsWith(',')) trimmed = trimmed.slice(0, -1)
  const lead = trimmed.endsWith('[') ? '' : ',\n'
  const litIndented = literal.split('\n').map((l) => '  ' + l).join('\n')
  return trimmed + lead + litIndented + '\n' + after
}
function removeTextbook(content, marker, textbookId) {
  const closeIdx = findMatchingClose(content, marker)
  if (closeIdx < 0) return content
  const arrStart = content.indexOf(marker) + marker.length - 1
  const objs = []
  let depth = 0, objStart = -1, inStr = null
  for (let i = arrStart; i <= closeIdx; i++) {
    const r = skipStrings(content, i, closeIdx, inStr)
    inStr = r.inStr; i = r.next - 1
    const ch = content[i]
    if (ch === '{') { if (depth === 0) objStart = i; depth++ }
    else if (ch === '}') { depth--; if (depth === 0) { objs.push([objStart, i]); objStart = -1 } }
  }
  for (const [a, b] of objs) {
    if (content.slice(a, b + 1).includes(`id: '${textbookId}'`) || content.slice(a, b + 1).includes(`textbookId: '${textbookId}'`)) {
      let end = b + 1
      let k = end
      while (k < closeIdx && /\s/.test(content[k])) k++
      if (content[k] === ',') { end = k + 1; while (end < closeIdx && /\s/.test(content[end])) end++ }
      return content.slice(0, a) + content.slice(end)
    }
  }
  return content
}

// ── 主流程 ──
if (require.main === module) {
const bookId = process.argv[2]
const dryRun = process.argv.includes('--dry-run')
const force = process.argv.includes('--force')
if (!bookId) { console.error('用法: node 05_emit.cjs <bookId> [--dry-run] [--force]'); process.exit(1) }
const enrichedPath = path.join(__dirname, 'books', bookId, 'book.enriched.json')
if (!fs.existsSync(enrichedPath)) { console.error('请先运行 03_enrich.cjs'); process.exit(1) }
const book = JSON.parse(fs.readFileSync(enrichedPath, 'utf-8'))

const contentLiteral = genTextbook(book, 0)
const vocabLiteral = genVocab(book, 0)

if (dryRun) {
  const prev = fs.existsSync(CONTENT) ? fs.readFileSync(CONTENT, 'utf-8') : ''
  const preview = `// ===== DRY-RUN 预览：${book.textbookId} 将插入 content.ts 的 textbooks 数组 =====\n${contentLiteral}\n\n// ===== DRY-RUN 预览：${book.textbookId} 将插入 textbookDict.ts 的 textbookVocabList 数组 =====\n${vocabLiteral}\n`
  const prevExists = prev.includes(`id: '${book.textbookId}'`)
  const pvPath = path.join(__dirname, 'books', bookId, 'emit.preview.ts')
  fs.writeFileSync(pvPath, preview, 'utf-8')
  console.log(`[dry-run] 已写入预览：${pvPath}`)
  console.log(`[dry-run] 课文对象 ${contentLiteral.length} 字符；生词对象 ${vocabLiteral.length} 字符`)
  console.log(`[dry-run] 当前 content.ts ${prevExists ? '已包含' : '未包含'} 该教材`)
  process.exit(0)
}

for (const [file, marker, literal] of [
  [CONTENT, 'export const textbooks: Textbook[] = [', contentLiteral],
  [DICT, 'export const textbookVocabList: TextbookVocab[] = [', vocabLiteral],
]) {
  if (!fs.existsSync(file)) { console.error('找不到', file); process.exit(1) }
  let content = fs.readFileSync(file, 'utf-8')
  const key = marker.includes('textbooks') ? `id: '${book.textbookId}'` : `textbookId: '${book.textbookId}'`
  if (content.includes(key)) {
    if (!force) { console.log(`[skip] ${file} 已包含 ${book.textbookId}（用 --force 覆盖）`); continue }
    content = removeTextbook(content, marker, book.textbookId)
  }
  const next = insertIntoArray(content, marker, literal)
  fs.writeFileSync(file, next, 'utf-8')
  console.log(`[emit] 已插入 ${book.textbookId} → ${file}`)
}
console.log('[emit] 完成。记得运行 `npm run build` 验证并 `node pipeline/06_audio.cjs <bookId>` 生成语音。')
} // end require.main

module.exports = { genTextbook, genVocab, insertIntoArray, findMatchingClose, removeTextbook }
