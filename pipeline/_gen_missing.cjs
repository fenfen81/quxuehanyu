#!/usr/bin/env node
// 补齐缺失的 hanyu-jiaocheng-2a 第一课语音
// 针对 public/audio 写锁做超强重试 + 原子写（.part -> rename）
const fs = require('fs')
const path = require('path')
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts')

// 防止 msedge-tts 内部 WebSocket 'error' 事件变成未捕获异常导致整批中断
process.on('uncaughtException', (e) => { console.error('UNCAUGHT(continue):', String(e && e.message || e)) })
process.on('unhandledRejection', (e) => { console.error('UNHANDLED(continue):', String(e && e.message || e)) })

const ROOT = path.join(__dirname, '..')
const VOICE = 'zh-CN-XiaoxiaoNeural'
const bookId = process.argv[2] || 'hanyu-jiaocheng-2a'
const enrichedPath = path.join(__dirname, 'books', bookId, 'book.enriched.json')
const book = JSON.parse(fs.readFileSync(enrichedPath, 'utf-8'))

const PUNCT = /[。？！，、；：…《》（）()"'·—~～,.?!:;'"　 \t]/g
const clean = (s) => (s || '').replace(PUNCT, '').replace(/\s+/g, '').trim()

const tasks = []
for (const L of book.lessons || []) {
  for (const t of L.texts || []) {
    for (const s of t.sentences || []) {
      if (!s.id || !s.cn) continue
      const full = clean(s.cn)
      if (full) tasks.push({ file: `audio/${s.id}.mp3`, text: full })
      const chunks = (s.split || '').split(/\s+/).filter(Boolean)
      if (chunks.length > 1) chunks.forEach((ch, n) => { const ct = clean(ch); if (ct) tasks.push({ file: `audio/${s.id}-c${n}.mp3`, text: ct }) })
    }
  }
  for (const w of L.words || []) {
    if (!w.id) continue
    if (w.hanzi) tasks.push({ file: `audio-words/${w.id}.mp3`, text: w.hanzi.length === 1 ? w.pinyin : w.hanzi })
    if (w.exampleCn) tasks.push({ file: `audio-words/${w.id}-ex.mp3`, text: w.exampleCn })
  }
}

function existsValid(rel) {
  const p = path.join(ROOT, 'public', rel)
  return fs.existsSync(p) && fs.statSync(p).size > 1000
}
const todos = tasks.filter((t) => !existsValid(t.file))
console.log(`缺失需生成：${todos.length} 个`)

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function genOne(rel, text) {
  for (let attempt = 0; attempt < 6; attempt++) {
    let tts
    try {
      tts = new MsEdgeTTS()
      await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
      const { audioStream } = tts.toStream(text)
      const chunks = []
      await new Promise((resolve, reject) => {
        audioStream.on('data', c => chunks.push(c))
        audioStream.on('end', resolve)
        audioStream.on('error', reject)
        setTimeout(() => reject(new Error('timeout')), 8000)
      })
      const buf = Buffer.concat(chunks)
      if (buf.length < 100) throw new Error('audio too small')
      const target = path.join(ROOT, 'public', rel)
      const part = target + '.part'
      fs.writeFileSync(part, buf)
      fs.renameSync(part, target) // 原子替换，缩短被锁窗口
      try { tts.close() } catch {}
      return true
    } catch (e) {
      try { if (tts) tts.close() } catch {}
      const msg = String(e && e.message || e)
      if (/EPERM|timeout|too small/.test(msg)) { await sleep(300 * (attempt + 1)); continue }
      throw e
    }
  }
  return false
}

async function main() {
  let ok = 0, fail = 0
  for (let i = 0; i < todos.length; i++) {
    const t = todos[i]
    const r = await genOne(t.file, t.text)
    if (r) ok++; else { fail++; console.error('FAIL', t.file) }
    await sleep(150)
    if ((ok + fail) % 5 === 0 || i === todos.length - 1) console.log(`进度 ${ok + fail}/${todos.length} ok=${ok} fail=${fail}`)
  }
  console.log(`完成：ok=${ok} fail=${fail}`)
  if (fail) process.exit(1)
}
main().catch(e => { console.error(e); process.exit(1) })
