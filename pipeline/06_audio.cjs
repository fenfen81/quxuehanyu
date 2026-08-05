#!/usr/bin/env node
// 06_audio.cjs — 为某本教材生成 edge-tts 语音
//   句子完整音:  public/audio/<id>.mp3            （汉语教程走逐词分词，故同时生成 -c{n}.mp3 每段）
//   单词音:      public/audio-words/<id>.mp3
//   例句音:      public/audio-words/<id>-ex.mp3
// 幂等：已存在且体积正常则跳过。需要联网调用 Microsoft Edge TTS。
const fs = require('fs')
const path = require('path')
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts')

const ROOT = path.join(__dirname, '..')
// 防止单个 TTS 调用的底层 WebSocket 抛出未捕获异常导致整批中断（沙盒网络偶发 ETIMEDOUT）
process.on('uncaughtException', (e) => { console.error('UNCAUGHT(continue):', String(e && e.message || e)) })
process.on('unhandledRejection', (e) => { console.error('UNHANDLED(continue):', String(e && e.message || e)) })
// AUDIO_OUT 可覆盖输出根：先生成到临时目录（避免 public/audio 写入被文件过滤器锁死），再另行 cp 进去
const OUT_ROOT = process.env.AUDIO_OUT ? path.resolve(process.env.AUDIO_OUT) : ROOT
const AUDIO_DIR = path.join(OUT_ROOT, 'public', 'audio')
const WORDS_DIR = path.join(OUT_ROOT, 'public', 'audio-words')
const VOICE = 'zh-CN-XiaoxiaoNeural'

const bookId = process.argv[2]
if (!bookId) { console.error('用法: node 06_audio.cjs <bookId>'); process.exit(1) }
const enrichedPath = path.join(__dirname, 'books', bookId, 'book.enriched.json')
if (!fs.existsSync(enrichedPath)) { console.error('请先运行 03_enrich.cjs'); process.exit(1) }
const book = JSON.parse(fs.readFileSync(enrichedPath, 'utf-8'))

const PUNCT = /[。？！，、；：…《》（）()"'·—~～,.?!:;'"　 \t]/g
const clean = (s) => (s || '').replace(PUNCT, '').replace(/\s+/g, '').trim()

const tasks = []
const SKIP = (process.env.AUDIO_SKIP || '').split(',').map((s) => s.trim()).filter(Boolean)
const skipSentences = SKIP.includes('sentences')
const skipChunks = SKIP.includes('chunks') || skipSentences
const skipWords = SKIP.includes('words')

for (const L of book.lessons || []) {
  for (const t of L.texts || []) {
    for (const s of t.sentences || []) {
      if (!s.id || !s.cn) continue
      if (!skipSentences) {
        // 整句音频保留原始标点（逗号/句号/问号等），TTS 据此做自然停顿
        const full = (s.cn || '').trim()
        if (full) tasks.push({ file: `audio/${s.id}.mp3`, text: full })
      }
      if (!skipChunks) {
        const chunks = (s.split || '').split(/\s+/).filter(Boolean)
        if (chunks.length > 1) {
          chunks.forEach((ch, n) => {
            const ct = clean(ch)
            if (ct) tasks.push({ file: `audio/${s.id}-c${n}.mp3`, text: ct })
          })
        }
      }
    }
  }
  if (!skipWords) {
    for (const w of L.words || []) {
      if (!w.id) continue
      if (w.hanzi) tasks.push({ file: `audio-words/${w.id}.mp3`, text: w.hanzi })
      if (w.exampleCn) tasks.push({ file: `audio-words/${w.id}-ex.mp3`, text: w.exampleCn })
    }
  }
}
console.log(`待生成音频任务：${tasks.length} 个`)

for (const d of [AUDIO_DIR, WORDS_DIR]) if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })

// 跳过「真实 public」中已有的（避免重复 TTS；生成到临时目录时尤其重要）
function existsValid(rel) {
  const p = path.join(ROOT, 'public', rel)
  return fs.existsSync(p) && fs.statSync(p).size > 1000
}
const todos = tasks.filter((t) => !existsValid(t.file))
console.log(`已存在有效：${tasks.length - todos.length}，本次生成：${todos.length}`)
if (!todos.length) { console.log('无新任务。'); process.exit(0) }

// 串行 + 失败重试（含 EPERM 退避）：Windows 实时防护会短暂锁定刚写入的 mp3，
// 并行写容易触发 EPERM；改为逐个生成、写后冷却，遇 EPERM/timeout 自动重试。
async function genOne(rel, text, attempt = 0) {
  try {
    const tts = new MsEdgeTTS()
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    const { audioStream } = tts.toStream(text)
    const chunks = []
    await new Promise((resolve, reject) => {
      audioStream.on('data', (c) => chunks.push(c))
      audioStream.on('end', resolve)
      audioStream.on('error', reject)
      setTimeout(() => reject(new Error('timeout')), 20000)
    })
    const buf = Buffer.concat(chunks)
    if (buf.length < 100) { try { tts.close() } catch {} throw new Error('audio too small') }
    fs.writeFileSync(path.join(OUT_ROOT, 'public', rel), buf)
    try { tts.close() } catch {}
  } catch (e) {
    try { /* best-effort close */ } catch {}
    if (attempt < 5 && /EPERM|timeout|too small/.test(String(e.message))) {
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)))
      return genOne(rel, text, attempt + 1)
    }
    throw e
  }
}

async function main() {
  let ok = 0, fail = 0
  const failed = []
  for (let i = 0; i < todos.length; i++) {
    const t = todos[i]
    try { await genOne(t.file, t.text); ok++ }
    catch (e) { fail++; failed.push(t); console.error('FAIL', t.file, e.message) }
    await new Promise((r) => setTimeout(r, 120)) // 冷却，给文件系统过滤器释放锁的时间
    if ((ok + fail) % 15 === 0 || ok + fail === todos.length) {
      console.log(`进度：${ok + fail}/${todos.length}（ok ${ok}, fail ${fail}）`)
    }
  }
  if (failed.length) {
    console.log(`\n重试 ${failed.length} 个失败项...`)
    await new Promise((r) => setTimeout(r, 3000))
    for (const t of failed) {
      try { await genOne(t.file, t.text); ok++; fail--; console.log('  重试 OK', t.file) }
      catch (e) { console.error('  重试失败', t.file, e.message) }
    }
  }
  console.log(`\n完成。成功 ${ok}，失败 ${fail}`)
  if (fail) process.exit(1)
}
main().catch((e) => { console.error(e); process.exit(1) })
