// Generate TTS audio for HSK5 textbook sentences + each chunk segment ONLY.
// Mirrors gen_sentence_audio.cjs but filters to id startsWith 'hsk5-',
// and only deletes hsk5 chunk (-c) files, leaving all other audio untouched.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const NODE = process.execPath;
const ESBUILD = path.join(__dirname, 'node_modules', 'esbuild', 'bin', 'esbuild');
const OUTPUT_DIR = path.join(__dirname, 'public', 'audio');

const PUNCT = /[。？！，、；：…《》（）()"'·—~～,.?!:;'"　 \t]/g;
const clean = (s) => (s || '').replace(PUNCT, '').replace(/\s+/g, '').trim();

console.log('Bundling content.ts & chunkSentence.ts ...');
execSync(`"${NODE}" "${ESBUILD}" src/data/content.ts --bundle --format=cjs --outfile=tmp_content_bundle.cjs`, { cwd: __dirname, stdio: 'ignore' });
execSync(`"${NODE}" "${ESBUILD}" src/utils/chunkSentence.ts --bundle --format=cjs --outfile=tmp_chunk_bundle.cjs`, { cwd: __dirname, stdio: 'ignore' });
const { textbooks } = require('./tmp_content_bundle.cjs');
const { chunkSentence } = require('./tmp_chunk_bundle.cjs');

// 断点续传模式：已生成的 -c 分段文件有效（来自新的带标点 chunks），不再强制删除。
// 仅首次重建时取消下方注释以清除旧 -c 文件。本段保持注释以保留已生成的 226 个有效分段。
// if (fs.existsSync(OUTPUT_DIR)) {
//   let removed = 0;
//   for (const f of fs.readdirSync(OUTPUT_DIR)) {
//     if (!f.endsWith('.mp3')) continue;
//     if (/^hsk5-.*-c\d+\.mp3$/.test(f)) {
//       try { fs.unlinkSync(path.join(OUTPUT_DIR, f)); removed++; } catch (e) {}
//     }
//   }
//   console.log(`Removed ${removed} stale HSK5 segment (-c) mp3 files`);
// }
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const tasks = [];
let sentenceCount = 0;
for (const tb of textbooks) {
  for (const lesson of tb.lessons) {
    for (const text of lesson.texts) {
      for (const s of text.sentences) {
        if (!s.id || !s.cn) continue;
        if (!s.id.startsWith('hsk5-')) continue; // 仅 HSK5
        sentenceCount++;
        const fullText = clean(s.cn);
        if (fullText) tasks.push({ file: `${s.id}.mp3`, text: fullText });
        const chunks = chunkSentence(s.cn, s.split);
        if (chunks.length > 1) {
          chunks.forEach((c, i) => {
            const ct = clean(c);
            if (ct) tasks.push({ file: `${s.id}-c${i}.mp3`, text: ct });
          });
        }
      }
    }
  }
}
console.log(`HSK5 Sentences: ${sentenceCount}, total audio tasks (full + segments): ${tasks.length}`);

function generateOne(task) {
  return new Promise((resolve, reject) => {
    let tts;
    try {
      tts = new MsEdgeTTS();
      tts.setMetadata('zh-CN-XiaoxiaoNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
        .then(() => {
          const { audioStream } = tts.toStream(task.text);
          const chunks = [];
          audioStream.on('data', (c) => chunks.push(c));
          audioStream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            if (buffer.length < 100) {
              try { tts.close(); } catch {}
              reject(new Error(`Audio too small for ${task.file}: ${buffer.length} bytes`));
              return;
            }
            try {
              fs.writeFileSync(path.join(OUTPUT_DIR, task.file), buffer);
              try { tts.close(); } catch {}
              resolve();
            } catch (err) {
              try { tts.close(); } catch {}
              reject(err);
            }
          });
          audioStream.on('error', (err) => { try { tts.close(); } catch {}; reject(err); });
        })
        .catch((err) => { try { if (tts) tts.close(); } catch {}; reject(err); });
    } catch (err) {
      try { if (tts) tts.close(); } catch {}
      reject(err);
    }
    setTimeout(() => { try { if (tts) tts.close(); } catch {}; reject(new Error(`Timeout for ${task.file}`)); }, 25000);
  });
}

async function main() {
  const BATCH_SIZE = 6;
  let success = 0, failed = 0;
  const failedTasks = [];

  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    const batch = tasks.slice(i, i + BATCH_SIZE).filter(t => {
      const p = path.join(OUTPUT_DIR, t.file);
      return !(fs.existsSync(p) && fs.statSync(p).size > 1000);
    });
    if (batch.length === 0) { success += tasks.slice(i, i + BATCH_SIZE).length; continue; }

    const results = await Promise.allSettled(batch.map(generateOne));
    for (let j = 0; j < results.length; j++) {
      if (results[j].status === 'fulfilled') success++;
      else { failed++; failedTasks.push(batch[j]); }
    }
    if ((success + failed) % 60 === 0 || success + failed === tasks.length) {
      console.log(`Progress: ${success + failed}/${tasks.length} (ok ${success}, fail ${failed})`);
    }
    if (i + BATCH_SIZE < tasks.length) await new Promise(r => setTimeout(r, 100));
  }

  if (failedTasks.length > 0) {
    console.log(`\nRetrying ${failedTasks.length} failed tasks...`);
    await new Promise(r => setTimeout(r, 3000));
    for (const t of failedTasks) {
      try { await generateOne(t); success++; failed--; }
      catch (e) { console.error(`  Retry failed ${t.file}: ${e.message}`); }
    }
  }

  const out = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith('hsk5-') && f.endsWith('.mp3'));
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Done! Success: ${success}, Failed: ${failed}`);
  console.log(`HSK5 audio files in public/audio: ${out.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => {
    try { fs.unlinkSync(path.join(__dirname, 'tmp_content_bundle.cjs')); } catch {}
    try { fs.unlinkSync(path.join(__dirname, 'tmp_chunk_bundle.cjs')); } catch {}
  });
