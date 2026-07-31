// Generate TTS audio for HSK words using Microsoft Edge TTS
// Usage: node gen_word_audio.cjs
const fs = require('fs');
const path = require('path');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const OUTPUT_DIR = path.join(__dirname, 'public', 'audio-words');

// Parse hskWords.ts to extract word data
const tsContent = fs.readFileSync(path.join(__dirname, 'src', 'data', 'hskWords.ts'), 'utf-8');
const wordRegex = /\{ id: '(hsk\d+_\d+)', hanzi: '([^']+)', pinyin: '([^']+)'/g;
const words = [];
let match;
while ((match = wordRegex.exec(tsContent)) !== null) {
  words.push({ id: match[1], hanzi: match[2], pinyin: match[3] });
}

// Target levels: env HSK_LEVELS (default "4,5,6") — regenerate natural voice for HSK4-6
// (HSK1-3 already have natural XiaoxiaoNeural audio; only 4-6 fell back to mechanical speechSynthesis)
const targetLevels = (process.env.HSK_LEVELS || '4,5,6').split(',').map(s => `hsk${s.trim()}_`);
const targetWords = words.filter(w => targetLevels.some(p => w.id.startsWith(p)));
console.log(`Total words: ${words.length}, generating for levels [${targetLevels.join(', ')}]: ${targetWords.length}`);

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Clean up test files
fs.readdirSync(OUTPUT_DIR).forEach(f => {
  if (f.startsWith('test_')) { try { fs.unlinkSync(path.join(OUTPUT_DIR, f)); } catch {} }
});

// Check which files already exist and are non-empty
const existing = new Set(
  fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.mp3'))
    .filter(f => fs.statSync(path.join(OUTPUT_DIR, f)).size > 1000)
    .map(f => f.replace('.mp3', ''))
);
const toGenerate = targetWords.filter(w => !existing.has(w.id));
console.log(`Already exist (valid): ${targetWords.length - toGenerate.length}, to generate: ${toGenerate.length}`);

function generateWord(word) {
  return new Promise(async (resolve, reject) => {
    let tts;
    try {
      tts = new MsEdgeTTS();
      await tts.setMetadata('zh-CN-XiaoxiaoNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      // 单字多音词按词表拼音朗读，避免 TTS 读错声调（如"背"读成 bèi）
      const ttsText = word.hanzi.length === 1 ? word.pinyin : word.hanzi;
      const { audioStream } = tts.toStream(ttsText);
      const chunks = [];

      audioStream.on('data', (chunk) => { chunks.push(chunk); });

      audioStream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length < 100) {
          try { tts.close(); } catch {}
          reject(new Error(`Audio too small for ${word.id}: ${buffer.length} bytes`));
          return;
        }
        try {
          fs.writeFileSync(path.join(OUTPUT_DIR, `${word.id}.mp3`), buffer);
          try { tts.close(); } catch {}
          resolve();
        } catch (err) {
          try { tts.close(); } catch {}
          reject(err);
        }
      });

      audioStream.on('error', (err) => {
        try { tts.close(); } catch {}
        reject(err);
      });

      // Timeout after 20 seconds
      setTimeout(() => {
        try { tts.close(); } catch {}
        reject(new Error(`Timeout for ${word.id}`));
      }, 20000);
    } catch (err) {
      try { if (tts) tts.close(); } catch {}
      reject(err);
    }
  });
}

async function main() {
  const BATCH_SIZE = 4;
  let success = 0;
  let failed = 0;
  const failedWords = [];

  for (let i = 0; i < toGenerate.length; i += BATCH_SIZE) {
    const batch = toGenerate.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(word => generateWord(word)));

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === 'fulfilled') {
        success++;
      } else {
        failed++;
        failedWords.push(batch[j]);
        console.error(`Failed: ${batch[j].id} (${batch[j].hanzi}): ${results[j].reason.message}`);
      }
    }

    if ((success + failed) % 50 === 0) {
      console.log(`Progress: ${success + failed}/${toGenerate.length} (ok: ${success}, fail: ${failed})`);
    }

    // Small delay between batches
    if (i + BATCH_SIZE < toGenerate.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Retry failed words
  if (failedWords.length > 0) {
    console.log(`\nRetrying ${failedWords.length} failed words...`);
    await new Promise(r => setTimeout(r, 3000));
    for (const word of failedWords) {
      try {
        await generateWord(word);
        success++;
        failed--;
      } catch (err) {
        console.error(`Retry failed: ${word.id}: ${err.message}`);
      }
    }
  }

  const finalCount = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.mp3') && !f.startsWith('test_')).length;
  console.log(`\nDone! Success: ${success}, Failed: ${failed}`);
  console.log(`Total MP3 files: ${finalCount}`);
}

main().catch(console.error);
