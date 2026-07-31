// 修复多音字/多音词音频：让 TTS 按词表拼音朗读
// 方案：单字词传拼音；少数测试确认 TTS 读错的多字词用同音字替换。
const fs = require('fs');
const path = require('path');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const OUTPUT_DIR = path.join(__dirname, 'public', 'audio-words');

// 需要修复的词：id -> 传给 TTS 的文本
const FIX_TEXT = {
  // 教材 textbookDict.ts 中的单字多音词（按拼音读）
  'l9-w15': 'shǔ',   // 数
  'l15-w7': 'zhǐ',   // 只
  'l17-w26': 'jiāo', // 教
  'l14-w3': 'ā',     // 啊

  // HSK 标准教程中的单字多音词
  'hsk5-l2-w35': 'pū',   // 铺
  'hsk5-l4-w1': 'bēi',   // 背（用户截图反馈）
  'hsk5-l5-w41': 'wéi',  // 为
  'hsk5-l7-w40': 'gǎn',  // 杆
  'hsk5-l8-w32': 'dào',  // 倒
  'hsk5-l10-w18': 'jì',  // 系
  'hsk5-l14-w23': 'zhòng', // 种
  'hsk5-l14-w30': 'wéi',   // 为

  // HSK 等级词库中的单字多音词
  'hsk1_0092': 'shéi',   // 谁
  'hsk3_0401': 'huán',   // 还
  'hsk3_0419': 'jiāo',   // 教
  'hsk3_0579': 'zhǎng',  // 长
  'hsk3_0584': 'zhǐ',    // 只
  'hsk4_0678': 'dào',    // 倒
  'hsk4_0731': 'gàn',    // 干
  'hsk5_1945': 'qiē',    // 切
  'hsk6_2501': 'ái',     // 挨
  'hsk6_2519': 'bá',     // 拨
  'hsk6_2756': 'chéng',  // 盛
  'hsk6_3235': 'hāi',    // 嗨
  'hsk6_3268': 'hōng',   // 哄
  'hsk6_3283': 'pō',     // 泊
  'hsk6_3529': 'juǎn',   // 卷
  'hsk6_3807': 'níng',   // 拧
  'hsk6_3891': 'pū',     // 铺
  'hsk6_3951': 'qiāng',  // 抢
  'hsk6_3979': 'tiě',    // 帖
  'hsk6_4238': 'tā',     // 踏
  'hsk6_4239': 'dǒu',    // 斗
  'hsk6_4497': 'lù',     // 露
  'hsk6_4524': 'xīng',   // 兴

  // 多字词：经测试 TTS 按默认音读错，用同音字替换目标字
  'hsk5-l8-w1': '招三暮四', // 朝 zhāo -> 招
  'hsk6_2647': '众播',      // 播种：种 zhòng -> 众
  'hsk6_4894': '众植',      // 种植：种 zhòng -> 众（保险起见也替换）
  'hsk6_4524': '兴高彩烈',  // 兴 xīng 已读对，此条可去掉；保留 harmless
};

// 移除无害但不必替换的多字词
delete FIX_TEXT['hsk6_4524'];

const toFix = Object.entries(FIX_TEXT);
console.log(`Fixing ${toFix.length} multi-tone audio files...`);

async function generateOne(id, text) {
  const out = path.join(OUTPUT_DIR, `${id}.mp3`);
  let tts;
  try {
    tts = new MsEdgeTTS();
    await tts.setMetadata('zh-CN-XiaoxiaoNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);
    const chunks = [];
    await new Promise((resolve, reject) => {
      audioStream.on('data', c => chunks.push(c));
      audioStream.on('end', resolve);
      audioStream.on('error', reject);
      setTimeout(() => reject(new Error('timeout')), 25000);
    });
    const buf = Buffer.concat(chunks);
    if (buf.length < 1000) throw new Error(`audio too small: ${buf.length}`);
    fs.writeFileSync(out, buf);
    console.log(`OK ${id} -> "${text}" (${buf.length} bytes)`);
    try { tts.close(); } catch {}
    return true;
  } catch (e) {
    try { if (tts) tts.close(); } catch {}
    console.error(`FAIL ${id}: ${e.message}`);
    return false;
  }
}

(async () => {
  let ok = 0;
  let fail = 0;
  for (const [id, text] of toFix) {
    const success = await generateOne(id, text);
    if (success) ok++; else fail++;
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`\nDone. OK: ${ok}, Failed: ${fail}`);
})().catch(console.error);
