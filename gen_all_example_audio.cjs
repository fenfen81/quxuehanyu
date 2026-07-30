// 生成全部例句音频（教材生词 + HSK1-6 等级词卡）
// 用法：
//   AUDIO_LIMIT=30 node gen_all_example_audio.cjs   # 测试前30条
//   node gen_all_example_audio.cjs                  # 全量（断点续跑，重复运行自动跳过已生成）
const esbuild = require('esbuild')
const fs = require('fs')
const path = require('path')
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts')

const TMP = path.join(require('os').tmpdir(), 'qxhy_audio_tmp')
fs.mkdirSync(TMP, { recursive: true })

function compile(entry, out) {
  esbuild.buildSync({ entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node', outfile: out, logLevel: 'error' })
}
console.log('编译 TS 模块...')
compile('src/data/examples.ts', path.join(TMP, 'examples.cjs'))
compile('src/data/hskWords.ts', path.join(TMP, 'hskwords.cjs'))
compile('src/data/textbookDict.ts', path.join(TMP, 'tb.cjs'))
const { genExample } = require(path.join(TMP, 'examples.cjs'))
const { hskWords } = require(path.join(TMP, 'hskwords.cjs'))
const { textbookVocabList } = require(path.join(TMP, 'tb.cjs'))

// 收集全部例句 {id, text}
const items = []
for (const tb of textbookVocabList) {
  for (const lesson of tb.lessons) {
    for (const w of lesson.words) {
      if (w.exampleCn) items.push({ id: w.id, text: w.exampleCn })
    }
  }
}
for (const w of hskWords) {
  const ex = genExample(w)
  if (ex && ex.cn) items.push({ id: w.id, text: ex.cn })
}

const LIMIT = process.env.AUDIO_LIMIT ? parseInt(process.env.AUDIO_LIMIT, 10) : items.length
const target = items.slice(0, Math.min(LIMIT, items.length))
console.log(`收集到 ${items.length} 条例句，本次处理 ${target.length} 条`)

const OUTDIR = 'public/audio-words'
fs.mkdirSync(OUTDIR, { recursive: true })
const VOICE = 'zh-CN-XiaoxiaoNeural'
const CONCUR = 16
const MIN_SIZE = 1000

let done = 0, skip = 0, fail = 0

async function genOne(it, tries = 3) {
  const out = path.join(OUTDIR, it.id + '-ex.mp3')
  if (fs.existsSync(out) && fs.statSync(out).size >= MIN_SIZE) { skip++; return }
  for (let a = 1; a <= tries; a++) {
    let tts
    try {
      tts = new MsEdgeTTS()
      await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
      const { audioStream } = tts.toStream(it.text)
      const buf = await new Promise((resolve, reject) => {
        const chunks = []
        audioStream.on('data', (c) => chunks.push(c))
        audioStream.on('end', () => resolve(Buffer.concat(chunks)))
        audioStream.on('error', reject)
        setTimeout(() => reject(new Error('timeout')), 25000)
      })
      if (buf.length < MIN_SIZE) throw new Error('音频过小')
      fs.writeFileSync(out, buf)
      try { tts.close() } catch {}
      done++
      return
    } catch (e) {
      try { if (tts) tts.close() } catch {}
      if (a < tries) { await new Promise((r) => setTimeout(r, 800)); continue }
      fail++
      console.error('FAIL', it.id, '-', (e && e.message) || e)
      return
    }
  }
}

async function run() {
  let i = 0
  while (i < target.length) {
    const batch = target.slice(i, i + CONCUR)
    await Promise.all(batch.map((it) => genOne(it)))
    i += CONCUR
    console.log(`进度 ${i}/${target.length}  新增=${done} 跳过=${skip} 失败=${fail}`)
  }
  console.log('批次完成', { 新增: done, 跳过: skip, 失败: fail })
}
run()
