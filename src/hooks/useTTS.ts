import { useCallback, useEffect, useRef, useState } from 'react'

// ── 句子 ID -> 音频文件名 ──
// 文件名格式: {sentenceId}.mp3，由 gen_audio.py 生成到 public/audio/
const SENTENCE_IDS: string[] = [
  // === 第一册（上）第1-15课 ===
  'l1t1s1','l1t1s2',
  'l2t1s1','l2t1s2','l2t1s3','l2t1s4',
  'l3t1s1','l3t1s2','l3t1s3','l3t1s4','l3t2s5','l3t2s6','l3t2s7','l3t2s8',
  'l4t1s1','l4t1s2','l4t1s3','l4t1s4','l4t1s5','l4t1s6','l4t1s7','l4t2s8','l4t2s9',
  'l5t1s1','l5t1s2','l5t1s3','l5t1s4','l5t1s5','l5t1s6','l5t1s7','l5t1s8','l5t1s9',
  'l6t1s1','l6t1s2','l6t1s3','l6t1s4','l6t1s5','l6t1s6','l6t1s7','l6t1s8','l6t1s9','l6t1s10','l6t1s11',
  'l6t2s12','l6t2s13','l6t2s14','l6t2s15','l6t2s16','l6t2s17','l6t2s18','l6t2s19','l6t2s20','l6t2s21','l6t2s22','l6t2s23',
  'l7t1s1','l7t1s2','l7t1s3','l7t1s4','l7t1s5','l7t1s6','l7t1s7','l7t1s8','l7t1s9','l7t1s10','l7t1s11','l7t1s12','l7t1s13',
  'l8t1s1','l8t1s2','l8t1s3','l8t1s4','l8t1s5','l8t1s6','l8t1s7','l8t1s8','l8t1s9','l8t1s10','l8t1s11','l8t1s12','l8t1s13',
  'l9t1s1','l9t1s2','l9t1s3','l9t1s4','l9t1s5','l9t1s6','l9t1s7','l9t1s8','l9t1s9','l9t1s10','l9t1s11',
  'l10t1s1','l10t1s2','l10t1s3','l10t1s4','l10t1s5','l10t1s6','l10t1s7','l10t1s8','l10t1s9','l10t1s10','l10t1s11','l10t1s12',
  'l11t1s1','l11t1s2','l11t1s3','l11t1s4','l11t2s5','l11t2s6','l11t2s7','l11t2s8','l11t2s9','l11t2s10',
  'l11t3s11','l11t3s12','l11t3s13','l11t3s14','l11t3s15','l11t3s16',
  'l12t1s1','l12t1s2','l12t1s3','l12t1s4','l12t1s5','l12t1s6','l12t2s7','l12t2s8','l12t2s9','l12t2s10','l12t2s11',
  'l13t1s1','l13t1s2','l13t1s3','l13t1s4','l13t1s5','l13t1s6','l13t2s7','l13t2s8','l13t2s9','l13t2s10','l13t2s11','l13t2s12','l13t2s13','l13t2s14',
  'l14t1s1','l14t1s2','l14t1s3','l14t1s4','l14t1s5','l14t1s6','l14t1s7','l14t1s8','l14t1s9',
  'l14t2s10','l14t2s11','l14t2s12','l14t2s13','l14t2s14','l14t2s15','l14t2s16','l14t2s17','l14t2s18',
  'l15t1s1','l15t1s2','l15t1s3','l15t1s4','l15t1s5','l15t1s6','l15t1s7','l15t1s8',
  'l15t2s9','l15t2s10','l15t2s11','l15t2s12','l15t2s13','l15t2s14','l15t2s15','l15t2s16',
  // === 第一册（下）第16-25课 ===
  'l16t1s1','l16t1s2','l16t1s3','l16t1s4','l16t1s5','l16t1s6','l16t1s7',
  'l16t2s8','l16t2s9','l16t2s10','l16t2s11','l16t2s12','l16t2s13',
  'l17t1s1','l17t1s2','l17t1s3','l17t1s4','l17t1s5','l17t1s6','l17t1s7','l17t1s8','l17t1s9','l17t1s10','l17t1s11','l17t1s12','l17t1s13','l17t1s14','l17t1s15',
  'l17t2s16','l17t2s17','l17t2s18','l17t2s19','l17t2s20','l17t2s21','l17t2s22','l17t2s23',
  'l18t1s1','l18t1s2','l18t1s3','l18t1s4','l18t1s5','l18t1s6',
  'l18t2s7','l18t2s8','l18t2s9','l18t2s10','l18t2s11','l18t2s12','l18t2s13','l18t2s14','l18t2s15','l18t2s16',
  'l19t1s1','l19t1s2','l19t1s3','l19t1s4','l19t1s5','l19t1s6','l19t1s7','l19t1s8','l19t1s9','l19t1s10','l19t1s11',
  'l19t2s12','l19t2s13','l19t2s14','l19t2s15','l19t2s16','l19t2s17',
  'l20t1s1','l20t1s2','l20t1s3','l20t1s4','l20t1s5','l20t1s6','l20t1s7',
  'l20t2s8','l20t2s9','l20t2s10','l20t2s11','l20t2s12','l20t2s13','l20t2s14','l20t2s15','l20t2s16','l20t2s17','l20t2s18',
  'l21t1s1','l21t1s2','l21t1s3','l21t1s4','l21t1s5','l21t1s6','l21t1s7','l21t1s8','l21t1s9','l21t1s10',
  'l21t2s11','l21t2s12','l21t2s13','l21t2s14','l21t2s15','l21t2s16','l21t2s17','l21t2s18','l21t2s19',
  'l22t1s1','l22t1s2','l22t1s3','l22t1s4','l22t1s5','l22t1s6','l22t1s7','l22t1s8','l22t1s9','l22t1s10','l22t1s11','l22t1s12',
  'l23t1s1','l23t1s2','l23t1s3','l23t1s4','l23t1s5','l23t1s6','l23t1s7','l23t1s8',
  'l23t2s9','l23t2s10','l23t2s11','l23t2s12','l23t2s13','l23t2s14','l23t2s15','l23t2s16',
  'l24t1s1','l24t1s2','l24t1s3','l24t1s4','l24t1s5','l24t1s6',
  'l24t2s7','l24t2s8','l24t2s9','l24t2s10','l24t2s11','l24t2s12','l24t2s13','l24t2s14','l24t2s15','l24t2s16',
  'l24t3s17','l24t3s18',
  'l25t1s1','l25t1s2','l25t1s3','l25t1s4','l25t1s5','l25t1s6','l25t1s7','l25t1s8','l25t1s9','l25t1s10',
  'l25t2s11','l25t2s12','l25t2s13','l25t2s14','l25t2s15','l25t2s16','l25t2s17','l25t2s18','l25t2s19',
]

/** 安全获取 speechSynthesis（部分安卓浏览器/WebView 不支持） */
function getSynth(): SpeechSynthesis | null {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis
    }
  } catch {}
  return null
}

// 音频缓存 - 避免重复加载
const audioCache = new Map<string, HTMLAudioElement>()

/** 根据句子 ID 获取音频元素 */
function getAudioById(id: string): HTMLAudioElement | null {
  if (!SENTENCE_IDS.includes(id)) return null

  if (audioCache.has(id)) {
    return audioCache.get(id)!
  }

  const audio = new Audio(`./audio/${id}.mp3`)
  audio.preload = 'auto'
  audioCache.set(id, audio)
  return audio
}

export function useTTS() {
  const [ready] = useState(true)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  // 预加载 Web Speech API 语音作为 fallback
  useEffect(() => {
    const synth = getSynth()
    if (!synth) return // 安卓部分浏览器不支持，安全跳过

    const load = () => {
      try {
        const voices = synth.getVoices().filter((v) => v.lang.includes('zh'))
        if (voices.length > 0) {
          voicesRef.current = voices
        }
      } catch {}
    }
    load()
    try { synth.addEventListener('voiceschanged', load) } catch {}
    const timer = setInterval(load, 1000)
    return () => {
      try { synth.removeEventListener('voiceschanged', load) } catch {}
      clearInterval(timer)
    }
  }, [])

  /**
   * 播放语音
   * @param sentenceId - 句子ID（如 'l20t1s1'），用于匹配预生成的 edge-tts MP3
   * @param fallbackText - 回退文本（当没有预生成音频时用于 Web Speech API）
   */
  const speak = useCallback(
    (sentenceId: string, fallbackText?: string): Promise<'ok' | 'error' | 'loading'> => {
      return new Promise((resolve) => {
        // 停止当前播放
        if (currentAudioRef.current) {
          currentAudioRef.current.pause()
          currentAudioRef.current.currentTime = 0
          currentAudioRef.current = null
        }
        const synth = getSynth()
        if (synth) {
          try { synth.cancel() } catch {}
        }

        // 优先播放预生成的 MP3（通过句子 ID 匹配）
        const audio = getAudioById(sentenceId)
        if (audio) {
          currentAudioRef.current = audio
          audio.currentTime = 0
          audio.onended = () => {
            currentAudioRef.current = null
            resolve('ok')
          }
          audio.onerror = () => {
            currentAudioRef.current = null
            fallbackSpeak(fallbackText || sentenceId, voicesRef.current, resolve)
          }
          audio.play().catch(() => {
            currentAudioRef.current = null
            fallbackSpeak(fallbackText || sentenceId, voicesRef.current, resolve)
          })
          return
        }

        // 没有预生成音频，使用 Web Speech API
        fallbackSpeak(fallbackText || sentenceId, voicesRef.current, resolve)
      })
    },
    [],
  )

  return { speak, ready }
}

// Web Speech API 回退方案
function fallbackSpeak(
  text: string,
  voices: SpeechSynthesisVoice[],
  resolve: (value: 'ok' | 'error' | 'loading') => void,
) {
  const synth = getSynth()
  if (!synth) {
    // 安卓不支持 speechSynthesis 时直接返回
    resolve('error')
    return
  }
  if (voices.length === 0) {
    // 尝试实时获取一次
    try {
      const v = synth.getVoices().filter(v => v.lang.includes('zh'))
      if (v.length > 0) { voices = v }
      else { resolve('loading'); return }
    } catch { resolve('loading'); return }
  }
  try {
    const u = new SpeechSynthesisUtterance(text)
    if (voices[0]) u.voice = voices[0]
    u.lang = 'zh-CN'
    u.rate = 0.9
    u.volume = 1
    u.onend = () => resolve('ok')
    u.onerror = () => resolve('error')
    synth.speak(u)
  } catch {
    resolve('error')
  }
}
