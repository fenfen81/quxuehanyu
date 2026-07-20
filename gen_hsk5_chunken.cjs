// Generate per-segment English (chunkEn) for HSK5(上) sentences.
// Bundles content.ts via esbuild, runs chunkSentence, translates each chunk,
// caches results to hsk5_chunk_cache.json, writes src/data/hsk5ChunkEn.ts.
const esbuild = require('esbuild')
const path = require('path')
const fs = require('fs')

const appDir = __dirname
const CACHE = path.join(appDir, 'hsk5_chunk_cache.json')
const OUT = path.join(appDir, 'src/data/hsk5ChunkEn.ts')

// ── curated English for standalone function-word chunks (single tokens) ──
const FUNC_EN = {
  // connectives
  '但是': 'but', '但': 'but', '可是': 'but', '然而': 'however', '所以': 'so',
  '因此': 'therefore', '而且': 'moreover', '并且': 'and', '于是': 'so', '不过': 'however',
  '否则': 'otherwise', '那么': 'then', '随后': 'afterwards', '然后': 'then', '接着': 'then',
  '因为': 'because', '由于': 'due to', '如果': 'if', '虽然': 'although', '只要': 'as long as',
  '只有': 'only if', '不论': 'no matter', '无论': 'no matter', '为了': 'in order to',
  '除了': 'except', '即使': 'even if', '虽说': 'although', '只是': 'only', '其实': 'actually',
  '另外': 'in addition', '这样一来': 'in this way', '也就是说': 'that is to say', '而': 'and',
  '又': 'and', '故': 'so', '故而': 'so', '反之': 'on the contrary', '再说': 'besides',
  '还是': 'still', '或者': 'or', '果然': 'sure enough', '居然': 'unexpectedly', '虽': 'although',
  '因': 'because', '所': 'that which', '和': 'and', '与': 'and', '同': 'with',
  // negations (standalone single-char chunks)
  '不': 'not', '没': 'not', '没有': 'not', '别': 'don\'t', '未': 'not yet',
  // story-specific proper noun (除夕 monster)
  '夕': 'the monster (Xi)',
  // prepositions (standalone single tokens — rare, usually grabbed with phrase)
  '为': 'for', '给': 'for', '向': 'towards', '对': 'to', '跟': 'with', '从': 'from',
  '比': 'than', '往': 'towards', '朝': 'towards', '替': 'for', '由': 'by', '距': 'from',
  '离': 'from', '在': 'in', '到': 'to', '把': '(object marker)', '被': 'by',
  '对于': 'regarding', '关于': 'about', '将': 'will',
}

async function build() {
  const result = await esbuild.build({
    entryPoints: [path.join(appDir, 'src/data/content.ts')],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outfile: path.join(appDir, 'tmp_content_bundle.cjs'),
    alias: { '@': path.join(appDir, 'src') },
    logLevel: 'warning',
    write: true,
  })
  return require(path.join(appDir, 'tmp_content_bundle.cjs'))
}

async function translate(text) {
  const url = 'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(text) + '&langpair=zh|en&de=translator@example.com'
  const r = await fetch(url)
  const j = await r.json()
  const t = j && j.responseData && j.responseData.translatedText
  if (!t || /MYMEMORY WARNING/i.test(t)) return ''
  return clean(t)
}

/** 清理 mymemory 可能带回的 CAT 工具标记（<bpt>/<ept> 等）与换行 */
function clean(s) {
  return s.replace(/<[^>]*>/g, '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
}

;(async () => {
  const mode = process.argv[2] || 'run'
  const mod = await build()
  const textbooks = mod.textbooks
  const { chunkSentence } = require(path.join(appDir, 'tmp_chunk_bundle.cjs'))

  const hsk5 = textbooks.find((t) => t.title.includes('第五册'))
  if (!hsk5) { console.error('HSK5 textbook not found'); process.exit(1) }

  const sentences = []
  for (const lesson of hsk5.lessons) {
    for (const text of lesson.texts) {
      for (const s of text.sentences) sentences.push(s)
    }
  }
  console.log('HSK5 sentences:', sentences.length)

  // compute chunks + unique chunk set
  const uniq = new Map() // normChunk -> original chunk (with spaces)
  for (const s of sentences) {
    const chunks = chunkSentence(s.cn, s.split)
    s._chunks = chunks
    for (const c of chunks) {
      const n = c.replace(/\s+/g, '')
      if (!uniq.has(n)) uniq.set(n, c)
    }
  }
  console.log('unique chunks:', uniq.size)

  const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {}
  let needApi = 0, fromCache = 0, curated = 0
  for (const [n] of uniq) {
    if (FUNC_EN[n] !== undefined) { curated++; continue }
    if (cache[n] !== undefined) { fromCache++; continue }
    needApi++
  }
  console.log(`needApi=${needApi} fromCache=${fromCache} curated=${curated}`)

  if (mode === 'plan') {
    // print a few samples
    const samples = [...uniq.keys()].filter((k) => FUNC_EN[k] === undefined).slice(0, 10)
    console.log('sample chunks to translate:', samples)
    return
  }

  // ── run: translate missing unique chunks ──
  let done = 0
  for (const [n, orig] of uniq) {
    if (FUNC_EN[n] !== undefined) { cache[n] = FUNC_EN[n]; continue }
    if (cache[n] !== undefined) continue
    let en = ''
    for (let attempt = 0; attempt < 2 && !en; attempt++) {
      try { en = await translate(n) } catch (e) { en = '' }
    }
    cache[n] = en
    done++
    if (done % 50 === 0) {
      fs.writeFileSync(CACHE, JSON.stringify(cache, null, 0))
      console.log(`  translated ${done}/${needApi}`)
    }
  }
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 0))
  console.log('translation done. total cached:', Object.keys(cache).length)

  // ── build id -> chunkEn[] ──
  const map = {}
  let emptyCount = 0
  for (const s of sentences) {
    const arr = (s._chunks || []).map((c) => {
      const n = c.replace(/\s+/g, '')
      const e = FUNC_EN[n] !== undefined ? FUNC_EN[n] : clean(cache[n] || '')
      if (!e) emptyCount++
      return e
    })
    map[s.id] = arr
  }
  console.log('empty segment translations:', emptyCount)

  // ── write TS file ──
  const lines = ['// AUTO-GENERATED by gen_hsk5_chunken.cjs — per-segment English for HSK5(上).',
    '// chunkEn[i] aligns with chunkSentence(cn, split)[i].',
    'export const hsk5ChunkEn: Record<string, string[]> = {']
  for (const id of Object.keys(map)) {
    const arr = map[id].map((e) => JSON.stringify(e)).join(', ')
    lines.push(`  ${JSON.stringify(id)}: [${arr}],`)
  }
  lines.push('}')
  fs.writeFileSync(OUT, lines.join('\n') + '\n')
  console.log('wrote', OUT)
})().catch((e) => { console.error(e); process.exit(1) })
