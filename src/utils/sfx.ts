/**
 * 轻量级按键/交互音效系统
 * 使用 Web Audio API 合成，零外部依赖，无音频文件
 *
 * 用法：
 *   import { sfx } from '@/utils/sfx'
 *   sfx.play('click')    // 按键点击
 *   sfx.play('correct')  // 答对
 *   sfx.play('wrong')    // 答错
 *   sfx.play('flip')     // 翻转卡片
 *   sfx.play('type')     // 打字输入
 *   sfx.play('complete') // 完成/过关
 *   sfx.enabled = false  // 全局静音
 */

let audioCtx: AudioContext | null = null

function ctx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

/** 播放一个短促的合成音 */
function beep(config: {
  freq?: number       // 基频 Hz
  freqEnd?: number    // 滑音结束频率
  type?: OscillatorType
  duration?: number   // 秒
  volume?: number     // 0-1
  attack?: number     // 包络起音
  decay?: number      // 衰减
  detune?: number     // 音高偏移 cents
}) {
  const {
    freq = 800,
    freqEnd,
    type = 'sine',
    duration = 0.08,
    volume = 0.15,
    attack = 0.005,
    decay = 0.05,
    detune = 0,
  } = config

  try {
    const c = ctx()
    const osc = c.createOscillator()
    const gain = c.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, c.currentTime)
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, c.currentTime + duration)
    }
    osc.detune.setValueAtTime(detune, c.currentTime)

    gain.gain.setValueAtTime(0, c.currentTime)
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + attack)
    gain.gain.linearRampToValueAtTime(0, c.currentTime + duration + decay)

    osc.connect(gain).connect(c.destination)
    osc.start(c.currentTime)
    osc.stop(c.currentTime + duration + decay + 0.05)
  } catch {
    // AudioContext 可能被禁用，静默失败
  }
}

/** 噪声爆破（用于键盘敲击的 click 成分） */
function noiseBurst(config: {
  duration?: number
  volume?: number
  filterFreq?: number
  filterQ?: number
}) {
  const { duration = 0.012, volume = 0.06, filterFreq = 4000, filterQ = 0.8 } = config
  try {
    const c = ctx()
    const bufferSize = Math.max(1, Math.floor(c.sampleRate * duration))
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      // 指数衰减包络
      const env = Math.pow(1 - i / bufferSize, 2.5)
      data[i] = (Math.random() * 2 - 1) * env
    }
    const src = c.createBufferSource()
    src.buffer = buffer
    const filter = c.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = filterFreq
    filter.Q.value = filterQ
    const gain = c.createGain()
    gain.gain.value = volume
    src.connect(filter).connect(gain).connect(c.destination)
    src.start()
    src.stop(c.currentTime + duration + 0.02)
  } catch {}
}

// ── 音效定义 ──────────────────────────────────────────────────────────────────

const SFX_MAP: Record<string, () => void> = {
  /** 点击按钮：短促轻柔的"咔嗒"声 */
  click: () => beep({ freq: 1200, duration: 0.04, volume: 0.08, type: 'sine' }),

  /** 翻转卡片：快速滑音 */
  flip: () => beep({ freq: 600, freqEnd: 900, duration: 0.1, volume: 0.1, type: 'sine' }),

  /** 打字输入（旧版，保留兼容）：极轻微的高频声 */
  type: () => beep({ freq: 1800, duration: 0.025, volume: 0.04, type: 'square' }),

  /** 机械键盘敲击声：噪声 click + 低频 thock，沉浸感更强 */
  keyboard: () => {
    // 1) 高频噪声 click —— 键帽触底瞬间的脆响
    noiseBurst({ duration: 0.01, volume: 0.05, filterFreq: 4500, filterQ: 0.6 })
    // 2) 低频 thock —— 键体回弹的闷响
    setTimeout(() => beep({ freq: 220, freqEnd: 90, duration: 0.035, volume: 0.07, type: 'sine', attack: 0.002, decay: 0.025 }), 2)
    // 3) 微弱泛音 —— 增加真实感
    setTimeout(() => beep({ freq: 1200, duration: 0.015, volume: 0.02, type: 'triangle' }), 1)
  },

  /** 删除字符：低频短声 */
  delete: () => beep({ freq: 400, duration: 0.04, volume: 0.06, type: 'triangle' }),

  /** 答对：上行琶音（两个音符） */
  correct: () => {
    beep({ freq: 523, duration: 0.08, volume: 0.12, type: 'sine' })
    setTimeout(() => beep({ freq: 784, duration: 0.12, volume: 0.1, type: 'sine' }), 80)
  },

  /** 答错：低频下降音 */
  wrong: () => beep({ freq: 300, freqEnd: 150, duration: 0.2, volume: 0.12, type: 'sawtooth' }),

  /** 完成/过关：三连音上升 */
  complete: () => {
    beep({ freq: 523, duration: 0.1, volume: 0.12 })
    setTimeout(() => beep({ freq: 659, duration: 0.1, volume: 0.12 }), 100)
    setTimeout(() => beep({ freq: 784, duration: 0.18, volume: 0.14 }), 200)
  },

  /** 级别切换：柔和双音 */
  levelChange: () => {
    beep({ freq: 700, duration: 0.06, volume: 0.08 })
    setTimeout(() => beep({ freq: 900, duration: 0.08, volume: 0.07 }), 60)
  },
}

// ── 导出对象 ──────────────────────────────────────────────────────────────────

export const sfx = {
  /** 是否启用音效（持久化到 localStorage） */
  _enabled: (() => {
    try { return localStorage.getItem('quxue-sfx') !== 'off' }
    catch { return true }
  })(),

  get enabled(): boolean { return this._enabled },
  set enabled(v: boolean) {
    this._enabled = v
    try { localStorage.setItem('quxue-sfx', v ? 'on' : 'off') }
    catch {}
  },

  /** 播放指定音效名 */
  play(name: string) {
    if (!this._enabled) return
    const fn = SFX_MAP[name]
    if (fn) fn()
  },

  /** 预热 AudioContext（用户首次点击时调用） */
  warmup() {
    try { ctx() } catch {}
  },
}
