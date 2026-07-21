// Generate TTS audio for textbook words using Microsoft Edge TTS
// Usage: node gen_textbook_audio.cjs
// Generates real human voice (zh-CN-XiaoxiaoNeural) for all textbook vocabulary
const fs = require('fs');
const path = require('path');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const OUTPUT_DIR = path.join(__dirname, 'public', 'audio-words');

// Parse textbookDict.ts to extract word data
const tsContent = fs.readFileSync(path.join(__dirname, 'src', 'data', 'textbookDict.ts'), 'utf-8');

// Match pattern: id: 'lN-wN', hanzi: '...', pinyin: '...'
// Handle both single quotes and escaped quotes in values
const wordRegex = /\{\s*id:\s*'((?:l\d+|hsk1-l\d+|hsk5-l\d+)-w\d+)'\s*,\s*hanzi:\s*'([^']+)'/g;
const words = [];
let match;
while ((match = wordRegex.exec(tsContent)) !== null) {
  words.push({ id: match[1], hanzi: match[2] });
}

console.log(`Extracted ${words.length} textbook words from textbookDict.ts`);

if (words.length === 0) {
  console.error('ERROR: No words found! Check the regex pattern.');
  process.exit(1);
}

// Use all textbook words
const targetWords = words;
console.log(`Generating audio for ${targetWords.length} textbook words`);

// Show first few for verification
console.log('Sample words:');
targetWords.slice(0, 5).forEach(w => console.log(`  ${w.id}: ${w.hanzi}`));
console.log('  ...');
targetWords.slice(-3).forEach(w => console.log(`  ${w.id}: ${w.hanzi}`));

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Check which files already exist and are non-empty
const existing = new Set(
  fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.mp3'))
    .filter(f => fs.statSync(path.join(OUTPUT_DIR, f)).size > 1000)
    .map(f => f.replace('.mp3', ''))
);

// Filter to only textbook word IDs (start with 'l' and contain '-w')
const existingTextbook = new Set(
  [...existing].filter(id => /^(?:l\d+|hsk1-l\d+|hsk5-l\d+)-w\d+$/.test(id))
);

const toGenerate = targetWords.filter(w => !existingTextbook.has(w.id));
console.log(`\nAlready exist (valid): ${targetWords.length - toGenerate.length}, to generate: ${toGenerate.length}`);

function generateWord(word) {
  return new Promise(async (resolve, reject) => {
    let tts;
    try {
      tts = new MsEdgeTTS();
      await tts.setMetadata('zh-CN-XiaoxiaoNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(word.hanzi);
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
  const BATCH_SIZE = 3;
  let success = 0;
  let failed = 0;
  const failedWords = [];

  console.log(`\nStarting generation with batch size ${BATCH_SIZE}...`);

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

    // Progress report every 30 words or at the end
    if ((success + failed) % 30 === 0 || (success + failed) === toGenerate.length) {
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
        console.log(`  Retry OK: ${word.id} (${word.hanzi})`);
      } catch (err) {
        console.error(`  Retry failed: ${word.id}: ${err.message}`);
      }
    }
  }

  // Count textbook audio files
  const tbFiles = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.mp3') && /^(?:l\d+|hsk1-l\d+|hsk5-l\d+)-w\d+\.mp3$/.test(f));
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Done! Success: ${success}, Failed: ${failed}`);
  console.log(`Textbook audio files: ${tbFiles.length}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main().catch(console.error);
