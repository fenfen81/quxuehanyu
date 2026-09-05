// ══════════════════════════════════════════════════════════════════════════════
//  TTS — 优先播放预生成 MP3（安卓兼容），回退到 speechSynthesis
//  从 WordCardPage 抽离出来，供背单词页、查词弹窗、生词表预览共用
// ══════════════════════════════════════════════════════════════════════════════

let audioUnlocked = false

/** 安全获取 speechSynthesis */
function getSynth(): SpeechSynthesis | null {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis
    }
  } catch {}
  return null
}

function getZhVoice(): SpeechSynthesisVoice | null {
  const synth = getSynth()
  if (!synth) return null
  try {
    const voices = synth.getVoices()
    return voices.find(v => v.lang === 'zh-CN') || voices.find(v => v.lang.startsWith('zh')) || null
  } catch {}
  return null
}

/** 解锁音频播放（安卓要求首次用户手势触发 Audio/speechSynthesis） */
export function unlockAudio() {
  if (audioUnlocked) return
  try {
    const silent = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=')
    silent.volume = 0
    silent.play().then(() => { audioUnlocked = true }).catch(() => {})
  } catch {}
  // 同时解锁 speechSynthesis 作为 fallback
  const synth = getSynth()
  if (synth) {
    try {
      const u = new SpeechSynthesisUtterance(' ')
      u.volume = 0
      synth.speak(u)
    } catch {}
  }
}

// Audio 缓存
const wordAudioCache = new Map<string, HTMLAudioElement>()
let currentWordAudio: HTMLAudioElement | null = null

/** speechSynthesis 回退方案 */
export function speakWithSynth(text: string) {
  const synth = getSynth()
  if (!synth) return
  try {
    if (synth.paused) synth.resume()
    synth.cancel()
    setTimeout(() => {
      try {
        if (synth.paused) synth.resume()
        const u = new SpeechSynthesisUtterance(text)
        const v = getZhVoice()
        if (v) u.voice = v
        u.lang = 'zh-CN'
        u.rate = 0.85
        u.volume = 1
        synth.speak(u)
      } catch {}
    }, 80)
  } catch {}
}

/** 朗读中文单词：优先播放预生成 MP3，回退到 speechSynthesis */
export function speakWord(text: string, wordId?: string) {
  // 停止当前播放
  if (currentWordAudio) {
    currentWordAudio.pause()
    currentWordAudio.currentTime = 0
    currentWordAudio = null
  }
  const synth = getSynth()
  if (synth) { try { synth.cancel() } catch {} }

  // 优先播放预生成 MP3（安卓兼容，Audio.play() 在用户手势解锁后可自动播放）
  if (wordId) {
    const cached = wordAudioCache.get(wordId)
    if (cached) {
      currentWordAudio = cached
      cached.currentTime = 0
      cached.play().catch(() => {
        // MP3 播放失败，回退到 speechSynthesis
        speakWithSynth(text)
      })
      return
    }
    // 动态加载
    const audio = new Audio(`./audio-words/${wordId}.mp3`)
    audio.preload = 'auto'
    wordAudioCache.set(wordId, audio)
    currentWordAudio = audio
    audio.currentTime = 0
    audio.play().catch(() => {
      // MP3 播放失败，回退到 speechSynthesis
      speakWithSynth(text)
    })
    return
  }

  // 没有 wordId，直接用 speechSynthesis
  speakWithSynth(text)
}
