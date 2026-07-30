// 生成例句拼音数据文件（教材生词 + HSK1-6 等级词卡）
// 用法：node gen_example_pinyin.cjs
// 产出：src/data/examplePinyin.ts  ->  export const examplePinyinMap: Record<string,string>
const esbuild = require('esbuild')
const { pinyin } = require('pinyin-pro')
const fs = require('fs')
const path = require('path')

const TMP = path.join(require('os').tmpdir(), 'qxhy_pinyin_tmp')
fs.mkdirSync(TMP, { recursive: true })

function compile(entry, out) {
  esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outfile: out,
    logLevel: 'error',
  })
}

console.log('编译 TS 模块...')
compile('src/data/examples.ts', path.join(TMP, 'examples.cjs'))
compile('src/data/hskWords.ts', path.join(TMP, 'hskwords.cjs'))
compile('src/data/textbookDict.ts', path.join(TMP, 'tb.cjs'))

const { genExample } = require(path.join(TMP, 'examples.cjs'))
const { hskWords } = require(path.join(TMP, 'hskwords.cjs'))
const { textbookVocabList } = require(path.join(TMP, 'tb.cjs'))

// 中文标点移除，避免 pinyin-pro 把标点单独成 token
const PUNCT = /[，。！？、；：""''（）《》…—·]/g
function pin(text) {
  const clean = (text || '').replace(PUNCT, ' ').replace(/[A-Za-z]/g, '').replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  return pinyin(clean, { toneType: 'symbol', toneSandhi: true, type: 'array' }).join(' ')
}

const map = {}

// 1) 教材生词例句
let tbCount = 0
for (const tb of textbookVocabList) {
  for (const lesson of tb.lessons) {
    for (const w of lesson.words) {
      if (w.exampleCn && !map[w.id]) {
        map[w.id] = pin(w.exampleCn)
        tbCount++
      }
    }
  }
}

// 2) HSK1-6 等级词卡例句（genExample 确定性，按 hanzi 查表）
let hskCount = 0
for (const w of hskWords) {
  if (map[w.id]) continue
  const ex = genExample(w)
  if (ex && ex.cn) {
    map[w.id] = pin(ex.cn)
    hskCount++
  }
}

const ids = Object.keys(map).sort()
const lines = ids.map((k) => `  '${k}': '${map[k].replace(/'/g, "\\'")}',`)
const content =
  `// 自动生成 - 勿手动修改\n` +
  `// 由 gen_example_pinyin.cjs 生成：教材生词 + HSK1-6 等级词卡的例句拼音\n` +
  `// 采用实际变调读音（pinyin-pro toneSandhi），如「一本书」= yì běn shū\n` +
  `export const examplePinyinMap: Record<string, string> = {\n` +
  lines.join('\n') +
  `\n}\n`

fs.writeFileSync('src/data/examplePinyin.ts', content, 'utf8')
console.log(`完成：教材 ${tbCount} 条 + HSK ${hskCount} 条 = 共 ${ids.length} 条例句拼音 -> src/data/examplePinyin.ts`)
