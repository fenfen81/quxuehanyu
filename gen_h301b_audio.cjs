#!/usr/bin/env node
// gen_h301b_audio.cjs — 为 content.ts 中《汉语会话301句》上册 (hanyu-huihua-301-1b)
// 生成整句 + 分段语音，逻辑与 gen_hj2a_audio.cjs / pipeline/06_audio.cjs 一致（XiaoxiaoNeural / 24k MP3）。
// 直接从 content.ts 提取 hanyu-huihua-301-1b 对象，保证语音与「表格拼音分词」完全对应。
// 幂等：public/audio 中已存在且 >1KB 的跳过；可重复跑补齐（断点续跑）。
// 用法（本机或沙盒，需联网 Microsoft Edge TTS）：
//   node gen_h301b_audio.cjs
//   CONCURRENCY=8 node gen_h301b_audio.cjs
const fs = require('fs')
const path = require('path')
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts')

process.on('uncaughtException', (e) => { console.error('UNCAUGHT(continue):', String(e && e.message || e)) })
process.on('unhandledRejection', (e) => { console.error('UNHANDLED(continue):', String(e && e.message || e)) })

const ROOT = __dirname
const AUDIO_DIR = path.join(ROOT, 'public', 'audio')
const VOICE = 'zh-CN-XiaoxiaoNeural'
const BOOK_ID = 'hanyu-huihua-301-1b'

// ---- 从 content.ts 提取 hanyu-huihua-301-1b 对象 ----
const ts = fs.readFileSync(path.join(ROOT, 'src', 'data', 'content.ts'), 'utf-8')
const idpos = ts.indexOf(`"id": "${BOOK_ID}"`)
if (idpos < 0) { console.error(`未找到 ${BOOK_ID}`); process.exit(1) }
const ob = ts.lastIndexOf('{', idpos)
let depth = 0, end = -1
for (let j = ob; j < ts.length; j++) {
  if (ts[j] === '{') depth++
  else if (ts[j] === '}') { depth--; if (depth === 0) { end = j; break } }
}
let block = ts.slice(ob, end + 1)
block = block.replace(/,\s*(?=[\]}])/g, '') // 去除可能的尾随逗号（ts 允许、json 不允许）
const book = JSON.parse(block)

const PUNCT = /[。？！，、；：…《》（）()"'·—~～,.?!:;'"　 \t]/g
const clean = (s) => (s || '').replace(PUNCT, '').replace(/\s+/g, '').trim()

const tasks = []
for (const L of book.lessons || []) {
  for (const t of L.texts || []) {
    for (const s of t.sentences || []) {
      if (!s.id || !s.cn) continue
      const full = (s.cn || '').trim()
      if (full) tasks.push({ file: `audio/${s.id}.mp3`, text: full })
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
console.log(`待生成音频任务：${tasks.length} 个`)

if (process.argv.includes('--count')) {
  const byLesson = {}
  for (const t of tasks) {
    const m = t.file.match(/audio\/(h301b-l\d+)-/)
    if (m) byLesson[m[1]] = (byLesson[m[1]] || 0) + 1
  }
  console.log('分课统计：', JSON.stringify(byLesson, null, 0))
  process.exit(0)
}

if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true })

function existsValid(rel) {
  const p = path.join(ROOT, 'public', rel)
  return fs.existsSync(p) && fs.statSync(p).size > 1000
}
const todos = tasks.filter((t) => !existsValid(t.file))
console.log(`已存在有效：${tasks.length - todos.length}，本次生成：${todos.length}`)
if (!todos.length) { console.log('无新任务。'); process.exit(0) }

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
    fs.writeFileSync(path.join(ROOT, 'public', rel), buf)
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
  const CONCURRENCY = Math.min(8, Math.max(1, parseInt(process.env.CONCURRENCY || '4', 10) || 4))
  console.log(`并发度：${CONCURRENCY}`)
  let ok = 0, fail = 0
  const failed = []
  let idx = 0
  const worker = async () => {
    while (idx < todos.length) {
      const i = idx++
      const t = todos[i]
      try { await genOne(t.file, t.text); ok++ }
      catch (e) { fail++; failed.push(t); console.error('FAIL', t.file, e.message) }
      const done = ok + fail
      if (done % 25 === 0 || done === todos.length) {
        console.log(`进度：${done}/${todos.length}（ok ${ok}, fail ${fail}）`)
      }
    }
  }
  const workers = []
  for (let w = 0; w < CONCURRENCY; w++) workers.push(worker())
  await Promise.all(workers)
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
