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
  // 播放令牌：每次新的 speak/speakChunk 递增，过期的回调（句子已切换）不再回退机械音
  const tokenRef = useRef(0)

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
   * 加载并播放音频。
   * - 不立即 play()，而是等 canplay 事件（给冷缓存/CDN 冷启动留加载时间）；
   * - 遇到瞬时错误（网络/解码/中断，code 1/2/3）自动 load() 重试一次；
   * - 仅当文件确实缺失（code 4 = SRC_NOT_SUPPORTED）或重试耗尽才回退 Web Speech；
   * - 4 秒仍未可播则回退 Web Speech；
   * - token 不匹配（已被新的播放打断）时静默结束，不触发机械音。
   */
  const loadAndPlay = useCallback(
    (
      audio: HTMLAudioElement,
      fallbackText: string,
      token: number,
      attempt = 0,
    ): Promise<'ok' | 'error' | 'loading'> => {
      return new Promise((resolve) => {
        const MAX_ATTEMPTS = 2
        let settled = false
        let timer: ReturnType<typeof setTimeout> | undefined
        const finish = (v: 'ok' | 'error' | 'loading') => {
          if (settled) return
          settled = true
          if (timer) clearTimeout(timer)
          if (token === tokenRef.current) resolve(v)
          else resolve('loading')
        }
        // 回退前先校验 token：若句子已切换（token 过期），绝不发出机械音
        const safeFallback = (text: string) => {
          if (token !== tokenRef.current) { finish('loading'); return }
          fallbackSpeak(text, voicesRef.current, finish)
        }

        timer = setTimeout(() => {
          safeFallback(fallbackText)
        }, 4000)

        const onCanPlay = () => {
          audio.removeEventListener('canplay', onCanPlay)
          audio.removeEventListener('error', onError)
          audio.onended = () => finish('ok')
          audio.play().catch(() => safeFallback(fallbackText))
        }
        const onError = () => {
          audio.removeEventListener('canplay', onCanPlay)
          audio.removeEventListener('error', onError)
          const code = audio.error?.code
          // 4 = SRC_NOT_SUPPORTED：文件确实缺失/不支持 → 永久回退机械音
          if (code === 4 || attempt >= MAX_ATTEMPTS - 1) {
            safeFallback(fallbackText)
            return
          }
          // 瞬时错误（网络/解码/被中断）→ 重新加载再试一次
          audio.load()
          setTimeout(() => {
            if (settled) return
            if (token !== tokenRef.current) {
              finish('loading')
              return
            }
            audio.addEventListener('canplay', onCanPlay)
            audio.addEventListener('error', onError)
            if (audio.readyState >= 2) onCanPlay()
          }, 300)
        }

        audio.addEventListener('canplay', onCanPlay)
        audio.addEventListener('error', onError)

        // 已经缓冲好就直接播
        if (audio.readyState >= 2) {
          audio.removeEventListener('canplay', onCanPlay)
          audio.removeEventListener('error', onError)
          audio.onended = () => finish('ok')
          audio.play().catch(() => safeFallback(fallbackText))
        } else if (
          audio.networkState === HTMLMediaElement.NETWORK_EMPTY ||
          audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE
        ) {
          audio.load()
        }
      })
    },
    [],
  )

  /**
   * 播放语音
   * @param sentenceId - 句子ID（如 'l20t1s1'），用于匹配预生成的 edge-tts MP3
   * @param fallbackText - 回退文本（当没有预生成音频时用于 Web Speech API）
   */
  const speak = useCallback(
    (sentenceId: string, fallbackText?: string): Promise<'ok' | 'error' | 'loading'> => {
      tokenRef.current += 1
      const token = tokenRef.current
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
        return loadAndPlay(audio, fallbackText || sentenceId, token)
      }

      // 没有预生成音频，使用 Web Speech API
      return new Promise((resolve) => {
        fallbackSpeak(fallbackText || sentenceId, voicesRef.current, (v) => {
          if (token === tokenRef.current) resolve(v)
          else resolve('loading')
        })
      })
    },
    [loadAndPlay],
  )

  /**
   * 播放分段（segment）音频。
   * @param sentenceId - 所属句子ID（如 'l20t1s1'）
   * @param chunkIdx - 段号（0 起），对应预生成文件 {sentenceId}-c{chunkIdx}.mp3
   * @param fallbackText - 回退文本（当分段 MP3 缺失时用 Web Speech API 朗读本段汉字）
   */
  const speakChunk = useCallback(
    (sentenceId: string, chunkIdx: number, fallbackText: string): Promise<'ok' | 'error' | 'loading'> => {
      tokenRef.current += 1
      const token = tokenRef.current
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
        return loadAndPlay(audio, fallbackText, token)
      }

      return new Promise((resolve) => {
        fallbackSpeak(fallbackText, voicesRef.current, (v) => {
          if (token === tokenRef.current) resolve(v)
          else resolve('loading')
        })
      })
    },
    [loadAndPlay],
  )

  /** 预热音频（不播放），用于提前加载下一句/下一段，避免自动播放时冷缓存回退机械音 */
  const preload = useCallback((sentenceId: string) => {
    const audio = getAudioById(sentenceId)
    if (audio && (audio.networkState === HTMLMediaElement.NETWORK_EMPTY)) {
      audio.load()
    }
  }, [])

  const preloadChunk = useCallback((sentenceId: string, chunkIdx: number) => {
    const audio = getAudioById(`${sentenceId}-c${chunkIdx}`)
    if (audio && audio.networkState === HTMLMediaElement.NETWORK_EMPTY) {
      audio.load()
    }
  }, [])

  return { speak, speakChunk, preload, preloadChunk, ready }
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
