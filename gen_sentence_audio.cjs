// Generate TTS audio for every textbook sentence + each chunk segment
// Usage: node gen_sentence_audio.cjs
// Output: public/audio/{sentenceId}.mp3 (full sentence)
//         public/audio/{sentenceId}-c{n}.mp3 (segment n, only when chunks > 1)
// Voice: zh-CN-XiaoxiaoNeural (natural female). Old sentence-level mp3s are removed;
// textbook word audio (lN-wN.mp3) is preserved.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const NODE = process.execPath;
const ESBUILD = path.join(__dirname, 'node_modules', 'esbuild', 'bin', 'esbuild');
const OUTPUT_DIR = path.join(__dirname, 'public', 'audio');

// 标点符号 + 空白：朗读时清掉，避免机械停顿
const PUNCT = /[。？！，、；：…《》（）()"'·—~～,.?!:;'"　 \t]/g;
const clean = (s) => (s || '').replace(PUNCT, '').replace(/\s+/g, '').trim();

// ── 1. 打包数据 + 切分逻辑 ──
console.log('Bundling content.ts & chunkSentence.ts ...');
execSync(`"${NODE}" "${ESBUILD}" src/data/content.ts --bundle --format=cjs --outfile=tmp_content_bundle.cjs`, { cwd: __dirname, stdio: 'ignore' });
execSync(`"${NODE}" "${ESBUILD}" src/utils/chunkSentence.ts --bundle --format=cjs --outfile=tmp_chunk_bundle.cjs`, { cwd: __dirname, stdio: 'ignore' });
const { textbooks } = require('./tmp_content_bundle.cjs');
const { chunkSentence } = require('./tmp_chunk_bundle.cjs');

// ── 2. 删除旧分段音频（保留单词音频 + 完整句子音频）──
// 切分规则已变：所有 -c{n} 分段文件需重建；完整句子音频只取决于 cn，与切分无关，保留。
if (fs.existsSync(OUTPUT_DIR)) {
  let removed = 0;
  for (const f of fs.readdirSync(OUTPUT_DIR)) {
    if (!f.endsWith('.mp3')) continue;
    if (/^w-\S+\.mp3$/.test(f)) continue;     // 保留单词音频(hash 命名)
    if (/^l\d+-w\d+\.mp3$/.test(f)) continue; // 保留教材单词音频
    if (/-c\d+\.mp3$/.test(f)) {              // 分段音频：切分规则已变，一律删除重建
      try { fs.unlinkSync(path.join(OUTPUT_DIR, f)); removed++; } catch (e) {}
      continue;
    }
    if (/^(l|hsk).*\.mp3$/.test(f)) continue; // 保留完整句子音频(内容只取决于 cn)
    // 其它遗留文件删除
    try { fs.unlinkSync(path.join(OUTPUT_DIR, f)); removed++; } catch (e) {}
  }
  console.log(`Removed ${removed} stale segment (-c) mp3 files`);
}
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── 3. 收集生成任务 ──
const tasks = [];
let sentenceCount = 0;
for (const tb of textbooks) {
  for (const lesson of tb.lessons) {
    for (const text of lesson.texts) {
      for (const s of text.sentences) {
        if (!s.id || !s.cn) continue;
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
console.log(`Sentences: ${sentenceCount}, total audio tasks (full + segments): ${tasks.length}`);

// ── 4. 生成单个音频 ──
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
    // 超时保护
    setTimeout(() => { try { if (tts) tts.close(); } catch {}; reject(new Error(`Timeout for ${task.file}`)); }, 25000);
  });
}

// ── 5. 批量生成（已有文件跳过）──
async function main() {
  const BATCH_SIZE = 3;
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
    if (i + BATCH_SIZE < tasks.length) await new Promise(r => setTimeout(r, 150));
  }

  // 重试失败项
  if (failedTasks.length > 0) {
    console.log(`\nRetrying ${failedTasks.length} failed tasks...`);
    await new Promise(r => setTimeout(r, 3000));
    for (const t of failedTasks) {
      try { await generateOne(t); success++; failed--; }
      catch (e) { console.error(`  Retry failed ${t.file}: ${e.message}`); }
    }
  }

  const out = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.mp3'));
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Done! Success: ${success}, Failed: ${failed}`);
  console.log(`Audio files in public/audio: ${out.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => {
    try { fs.unlinkSync(path.join(__dirname, 'tmp_content_bundle.cjs')); } catch {}
    try { fs.unlinkSync(path.join(__dirname, 'tmp_chunk_bundle.cjs')); } catch {}
  });
