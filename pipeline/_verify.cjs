#!/usr/bin/env node
// _verify.cjs — 不写真实数据，内存中校验 05_emit 生成的 TS 字面量语法是否合法。
const fs = require('fs')
const path = require('path')
const esbuild = require('esbuild')
const emit = require('./05_emit.cjs')

const APP = path.join(__dirname, '..')
const CONTENT = path.join(APP, 'src', 'data', 'content.ts')
const DICT = path.join(APP, 'src', 'data', 'textbookDict.ts')
const contentSrc = fs.readFileSync(CONTENT, 'utf-8')
const dictSrc = fs.readFileSync(DICT, 'utf-8')

function checkSyntax(label, code) {
  try {
    esbuild.transformSync(code, { loader: 'ts', logLevel: 'silent' })
    console.log('  ✓ 语法合法:', label)
    return true
  } catch (e) {
    console.log('  ✗ 语法错误:', label)
    console.log('    ', String(e.message).split('\n').slice(0, 4).join('\n     '))
    return false
  }
}

let ok = true

// ── 1) 压力测试：构造含特殊字符的教材，校验生成器本身 ──
const stressBook = {
  textbookId: 'stresstest', categoryId: 'comprehensive', title: '压力测试', titleEn: 'Stress', level: '初级',
  lessons: [
    {
      lessonNum: 1, lessonId: 'lesson1', lessonTitle: '第一', lessonTitleEn: 'One',
      texts: [
        {
          id: 'st-l1-t1', label: '课文',
          sentences: [
            { id: 'st-l1-t1-s1', cn: '他问："你[真的]要去吗？"', split: '他 问 你 真的 要 去 吗', en: 'He asked: "Are you really going?"',
              dict: { '他': 'tā / he', '问': 'wèn / ask', '要去': 'yào qù / want to go' } },
            { id: 'st-l1-t1-s2', cn: '这是一行\n带换行的句子。', split: '这 是 一 行 带 换 行 的 句 子', en: 'A line\nwith newline.', dict: {} },
          ],
        },
      ],
      words: [
        { id: 'st-l1-w1', hanzi: '真的', pinyin: 'zhēn de', pos: 'adj', english: 'real', exampleCn: '他是"真的"朋友。', exampleEn: 'He is a "real" friend.', examplePinyin: 'Tā shì "zhēn de" péngyou.' },
      ],
    },
  ],
}
console.log('[1] 生成器压力测试（特殊字符/换行/空 dict）')
const cLit = emit.genTextbook(stressBook, 0)
const vLit = emit.genVocab(stressBook, 0)
// 单独校验生成器时，用 [ ... ] 包裹，避免 esbuild 把以 { 开头的文件当成语句块
ok = checkSyntax('genTextbook', '[\n' + cLit + '\n]') && ok
ok = checkSyntax('genVocab', '[\n' + vLit + '\n]') && ok

// 把压力教材插入真实 content.ts / textbookDict.ts 串中再做整体语法校验
const contentWithStress = emit.insertIntoArray(contentSrc, 'export const textbooks: Textbook[] = [', cLit)
const dictWithStress = emit.insertIntoArray(dictSrc, 'export const textbookVocabList: TextbookVocab[] = [', vLit)
console.log('[2] 插入真实 content.ts / textbookDict.ts 后整体语法校验（压力教材）')
ok = checkSyntax('content.ts + stress', contentWithStress) && ok
ok = checkSyntax('textbookDict.ts + stress', dictWithStress) && ok

// ── 3) 用真实 smoketest 教材（用户已产出的 enriched）端到端校验 ──
const smkPath = path.join(__dirname, 'books', '_smoketest', 'book.enriched.json')
if (fs.existsSync(smkPath)) {
  const smk = JSON.parse(fs.readFileSync(smkPath, 'utf-8'))
  const cLit2 = emit.genTextbook(smk, 0)
  const vLit2 = emit.genVocab(smk, 0)
  const contentWithSmk = emit.insertIntoArray(contentSrc, 'export const textbooks: Textbook[] = [', cLit2)
  const dictWithSmk = emit.insertIntoArray(dictSrc, 'export const textbookVocabList: TextbookVocab[] = [', vLit2)
  console.log('[3] 插入真实 content.ts / textbookDict.ts 后整体语法校验（_smoketest 教材）')
  ok = checkSyntax('content.ts + _smoketest', contentWithSmk) && ok
  ok = checkSyntax('textbookDict.ts + _smoketest', dictWithSmk) && ok
  // 校验无重复 id
  const dup1 = contentWithSmk.includes(`id: '${smk.textbookId}'`) && contentSrc.includes(`id: '${smk.textbookId}'`)
  console.log('  ' + (dup1 ? '✗ 检测到重复教材 id' : '✓ 无重复教材 id') + ` (${smk.textbookId})`)
} else {
  console.log('[3] 跳过：找不到 _smoketest/book.enriched.json')
}

console.log(ok ? '\n✅ 全部通过' : '\n❌ 存在语法问题，需修复')
process.exit(ok ? 0 : 1)
