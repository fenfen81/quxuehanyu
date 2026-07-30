// 生成教材生词句例音频（试点：汉语教程第一册上 第一课）
// 用法：node gen_textbook_example_audio.cjs
// 输出：public/audio-words/{id}-ex.mp3 （与单词音频 {id}.mp3 区分）
// 语音：Edge TTS zh-CN-XiaoxiaoNeural（自然人声，按整句实际读音朗读，含"一/不"变调）
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, 'public', 'audio-words')
const VOICE = 'zh-CN-XiaoxiaoNeural'

// 与 src/data/textbookDict.ts 第一课 exampleCn 完全一致
const data = [
  { id: 'l1-w1', text: '你好！' },
  { id: 'l1-w2', text: '我很好。' },
  { id: 'l1-w3', text: '这是一本书。' },
  { id: 'l1-w4', text: '我有五个朋友。' },
  { id: 'l1-w5', text: '这里有八张桌子。' },
  { id: 'l1-w6', text: '这个箱子很大。' },
  { id: 'l1-w7', text: '我不好。' },
  { id: 'l1-w8', text: '我家有三口人。' },
  { id: 'l1-w9', text: '这是白马。' },
  { id: 'l1-w10', text: '白马很大。' },
  { id: 'l1-w11', text: '她是女生。' },
]

function genOne(text, out) {
  return new Promise(async (resolve, reject) => {
    let tts
    try {
      tts = new MsEdgeTTS()
      await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
      const { audioStream } = tts.toStream(text)
      const chunks = []
      audioStream.on('data', (c) => chunks.push(c))
      audioStream.on('end', () => {
        const buf = Buffer.concat(chunks)
        if (buf.length < 100) { try { tts.close() } catch {} return reject(new Error('audio too small')) }
        fs.writeFileSync(out, buf)
        try { tts.close() } catch {}
        resolve()
      })
      audioStream.on('error', (e) => { try { tts.close() } catch {} reject(e) })
      setTimeout(() => { try { tts.close() } catch {} reject(new Error('timeout')) }, 20000)
    } catch (e) {
      try { if (tts) tts.close() } catch {}
      reject(e)
    }
  })
}

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  let ok = 0, fail = 0
  for (const { id, text } of data) {
    const out = path.join(OUT, `${id}-ex.mp3`)
    if (fs.existsSync(out) && fs.statSync(out).size > 1000) { console.log('skip', id); ok++; continue }
    let done = false
    for (let a = 1; a <= 3 && !done; a++) {
      try {
        await genOne(text, out)
        if (fs.existsSync(out) && fs.statSync(out).size > 1000) done = true
      } catch (e) {
        console.log('retry', id, a, (e && e.message) || e)
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
    console.log(done ? 'ok   ' + id : 'FAIL ' + id)
    done ? ok++ : fail++
  }
  console.log(`Done. ok=${ok} fail=${fail}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
