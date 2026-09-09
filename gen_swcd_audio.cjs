#!/usr/bin/env node
// gen_swcd_audio.cjs — 《想说就说·商务汉语口语完全手册》(business-chinese-handbook)
// 整句 + 意群分段语音（分段规则与前端一致：chunkSentence，见 isChunkedSentence）
// 幂等：public/audio 中已存在且 >1KB 跳过；可重复跑补齐（断点续跑）。
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts')

const ROOT = __dirname
const AUDIO_DIR = path.join(ROOT, 'public', 'audio')
const VOICE = 'zh-CN-XiaoxiaoNeural'
const BOOK_ID = 'business-chinese-handbook'

process.on('uncaughtException', (e) => console.error('UNCAUGHT(continue):', String(e && e.message || e)))
process.on('unhandledRejection', (e) => console.error('UNHANDLED(continue):', String(e && e.message || e)))

// 打包数据与分段逻辑
console.log('Bundling content.ts & chunkSentence.ts ...')
const NODE = process.execPath
const ESBUILD = path.join(ROOT, 'node_modules', 'esbuild', 'bin', 'esbuild')
execSync(`"${NODE}" "${ESBUILD}" src/data/content.ts --bundle --format=cjs --outfile=tmp_content_bundle.cjs`, { cwd: ROOT, stdio: 'ignore' })
execSync(`"${NODE}" "${ESBUILD}" src/utils/chunkSentence.ts --bundle --format=cjs --outfile=tmp_chunk_bundle.cjs`, { cwd: ROOT, stdio: 'ignore' })
const { textbooks } = require('./tmp_content_bundle.cjs')
const { chunkSentence } = require('./tmp_chunk_bundle.cjs')

const book = textbooks.find((t) => t.id === BOOK_ID)
if (!book) { console.error('未找到', BOOK_ID); process.exit(1) }

const PUNCT = /[。？！，、；：…《》（）()"'·—~～,.?!:;'"　 \t%]/g
const clean = (s) => (s || '').replace(PUNCT, '').replace(/\s+/g, '').trim()

const tasks = []
let segCount = 0
for (const L of book.lessons || []) {
  for (const t of L.texts || []) {
    for (const s of t.sentences || []) {
      if (!s.id || !s.cn) continue
      const full = clean(s.cn)
      if (full) tasks.push({ file: `audio/${s.id}.mp3`, text: full })
      // 与前端一致：优先用预生成的意群分段（swcdChunks），无则回退 chunkSentence
      const chunks = (s.chunk && s.chunk.length > 1) ? s.chunk : chunkSentence(s.cn, s.split)
      if (chunks.length > 1) {
        chunks.forEach((c, n) => {
          const ct = clean(c)
          if (ct) { tasks.push({ file: `audio/${s.id}-c${n}.mp3`, text: ct }); segCount++ }
        })
      }
    }
  }
}
console.log(`待生成：整句 ${tasks.length - segCount} + 意群分段 ${segCount} = ${tasks.length}`)
if (process.argv.includes('--count')) process.exit(0)

if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true })
const existsValid = (rel) => {
  const p = path.join(ROOT, 'public', rel)
  return fs.existsSync(p) && fs.statSync(p).size > 1000
}
const todos = tasks.filter((t) => !existsValid(t.file))
console.log(`已存在有效 ${tasks.length - todos.length}，本次生成 ${todos.length}`)
if (!todos.length) { console.log('无新任务'); process.exit(0) }

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
    if (attempt < 5 && /EPERM|timeout|too small/.test(String(e.message))) {
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)))
      return genOne(rel, text, attempt + 1)
    }
    throw e
  }
}

async function main() {
  const CONCURRENCY = Math.min(8, Math.max(1, parseInt(process.env.CONCURRENCY || '6', 10) || 6))
  let ok = 0, fail = 0, idx = 0
  const failed = []
  const worker = async () => {
    while (idx < todos.length) {
      const t = todos[idx++]
      try { await genOne(t.file, t.text); ok++ }
      catch (e) { fail++; failed.push(t); console.error('FAIL', t.file, e.message) }
      const done = ok + fail
      if (done % 50 === 0 || done === todos.length) console.log(`进度 ${done}/${todos.length}（ok ${ok}, fail ${fail}）`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  if (failed.length) {
    console.log(`重试 ${failed.length} 项...`)
    await new Promise((r) => setTimeout(r, 3000))
    for (const t of failed) {
      try { await genOne(t.file, t.text); ok++; fail-- } catch (e) { console.error('  重试失败', t.file, e.message) }
    }
  }
  console.log(`\n完成：成功 ${ok}，失败 ${fail}`)
  if (fail) process.exit(1)
}
main().catch((e) => { console.error(e); process.exit(1) })
