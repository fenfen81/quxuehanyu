import { useCallback, useEffect, useRef, useState } from 'react'

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

/**
 * 根据音频 ID 获取音频元素（按需创建，文件缺失时 onerror 回退 Web Speech API）。
 * id 约定：整句音频 = 句子ID（如 'l20t1s1'）；分段音频 = '{句子ID}-c{段号}'（如 'l20t1s1-c0'）。
 */
function getAudioById(id: string): HTMLAudioElement | null {
  if (!id) return null

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

  /**
   * 播放分段（segment）音频。
   * @param sentenceId - 所属句子ID（如 'l20t1s1'）
   * @param chunkIdx - 段号（0 起），对应预生成文件 {sentenceId}-c{chunkIdx}.mp3
   * @param fallbackText - 回退文本（当分段 MP3 缺失时用 Web Speech API 朗读本段汉字）
   */
  const speakChunk = useCallback(
    (sentenceId: string, chunkIdx: number, fallbackText: string): Promise<'ok' | 'error' | 'loading'> => {
      return new Promise((resolve) => {
        if (currentAudioRef.current) {
          currentAudioRef.current.pause()
          currentAudioRef.current.currentTime = 0
          currentAudioRef.current = null
        }
        const synth = getSynth()
        if (synth) {
          try { synth.cancel() } catch {}
        }

        const chunkId = `${sentenceId}-c${chunkIdx}`
        const audio = getAudioById(chunkId)
        if (audio) {
          currentAudioRef.current = audio
          audio.currentTime = 0
          audio.onended = () => {
            currentAudioRef.current = null
            resolve('ok')
          }
          audio.onerror = () => {
            currentAudioRef.current = null
            fallbackSpeak(fallbackText, voicesRef.current, resolve)
          }
          audio.play().catch(() => {
            currentAudioRef.current = null
            fallbackSpeak(fallbackText, voicesRef.current, resolve)
          })
          return
        }

        fallbackSpeak(fallbackText, voicesRef.current, resolve)
      })
    },
    [],
  )

  return { speak, speakChunk, ready }
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
