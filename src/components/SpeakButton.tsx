import { useState } from 'react'
import { t } from '@/i18n/translations'
import { useLang } from '@/i18n/useLang'
import { sfx } from '../utils/sfx'
import { speakWord, unlockAudio } from '../lib/speech'

/** 朗读按钮：优先播放预生成 MP3，回退到 speechSynthesis。点击不触发父级 onClick。 */
export function SpeakButton({ text, wordId, className = '' }: { text: string; wordId?: string; className?: string }) {
  const [playing, setPlaying] = useState(false)
  const { lang } = useLang()
  const speakTitle = t('words_tap_speak', lang)
  return (
    <button onClick={(e) => { e.stopPropagation(); unlockAudio(); speakWord(text, wordId); setPlaying(true); setTimeout(() => setPlaying(false), 1500); sfx.play('click') }}
            className={`inline-flex items-center justify-center rounded-full transition-all duration-150 hover:scale-110 active:scale-95 ${playing ? 'animate-pulse' : ''} ${className}`}
            title={speakTitle} aria-label={speakTitle}>
      {playing ? '🔊' : '🔈'}
    </button>
  )
}

/** 兼容旧命名的导出（背单词页沿用 SpeakBtn） */
export const SpeakBtn = SpeakButton
export default SpeakButton
