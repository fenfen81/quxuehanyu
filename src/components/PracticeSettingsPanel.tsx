import { usePracticeSettings, type FontSize, type ThemeStyle, type AudioRate } from '@/hooks/usePracticeSettings'
import { sfx } from '@/utils/sfx'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

const FONT_OPTIONS: { v: FontSize; k: string }[] = [
  { v: 'sm', k: 'settings_font_small' },
  { v: 'md', k: 'settings_font_medium' },
  { v: 'lg', k: 'settings_font_large' },
  { v: 'xl', k: 'settings_font_xl' },
  { v: 'xxl', k: 'settings_font_xxl' },
]
const RATE_OPTIONS: AudioRate[] = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const THEME_OPTIONS: { v: ThemeStyle; k: string; swatch: string }[] = [
  { v: 'blue', k: 'settings_theme_blue', swatch: 'bg-gradient-to-br from-sky-200 to-indigo-200' },
  { v: 'white', k: 'settings_theme_white', swatch: 'bg-white border border-slate-300' },
  { v: 'gray', k: 'settings_theme_gray', swatch: 'bg-slate-200' },
  { v: 'dark', k: 'settings_theme_dark', swatch: 'bg-slate-800' },
]
const AUTO_OPTIONS = [0, 1, 2, 3, 4, 5] // 0 = 手动

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={() => { sfx.play('click'); onClick() }}
      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
        active
          ? 'bg-blue-500 text-white shadow-sm'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2.5">{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

export function PracticeSettingsPanel({ lang = 'zh', onClose }: { lang?: Lang; onClose: () => void }) {
  const tt = (k: Parameters<typeof t>[0]) => t(k, lang)
  const {
    fontSize, audioRate, autoPlayTimes, keyboardSound, theme,
    setFontSize, setAudioRate, setAutoPlayTimes, setKeyboardSound, setTheme,
  } = usePracticeSettings()

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="sticky top-0 bg-white/95 backdrop-blur z-10 flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <h3 className="text-base font-bold text-slate-800">{tt('settings_title')}</h3>
          </div>
          <button
            onClick={() => { sfx.play('click'); onClose() }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all text-lg"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-2">
          <Section title={tt('settings_font_size')}>
            {FONT_OPTIONS.map((o) => (
              <SegButton key={o.v} active={fontSize === o.v} onClick={() => setFontSize(o.v)}>
                {tt(o.k as Parameters<typeof t>[0])}
              </SegButton>
            ))}
          </Section>

          <Section title={tt('settings_audio_speed')}>
            {RATE_OPTIONS.map((r) => (
              <SegButton key={r} active={audioRate === r} onClick={() => setAudioRate(r)}>
                {r}x
              </SegButton>
            ))}
          </Section>

          <Section title={tt('settings_auto_play')}>
            {AUTO_OPTIONS.map((n) => (
              <SegButton
                key={n}
                active={autoPlayTimes === n}
                onClick={() => setAutoPlayTimes(n)}
              >
                {n === 0 ? tt('settings_auto_manual') : String(n)}
              </SegButton>
            ))}
          </Section>

          <Section title={tt('settings_theme')}>
            {THEME_OPTIONS.map((o) => (
              <button
                key={o.v}
                onClick={() => { sfx.play('click'); setTheme(o.v) }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border ${
                  theme === o.v
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`w-4 h-4 rounded-full ${o.swatch}`} />
                {tt(o.k as Parameters<typeof t>[0])}
              </button>
            ))}
          </Section>

          <Section title={tt('settings_keyboard_sound')}>
            <button
              onClick={() => { sfx.play('click'); setKeyboardSound(!keyboardSound) }}
              className={`relative w-14 h-8 rounded-full transition-all ${keyboardSound ? 'bg-blue-500' : 'bg-slate-300'}`}
            >
              <span
                className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${keyboardSound ? 'left-7' : 'left-1'}`}
              />
            </button>
            <span className="text-sm text-slate-500 font-medium ml-1">
              {keyboardSound ? tt('settings_on') : tt('settings_off')}
            </span>
          </Section>
        </div>

        <div className="px-5 py-4 border-t border-slate-100">
          <button
            onClick={() => { sfx.play('click'); onClose() }}
            className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold text-sm shadow-sm hover:shadow-md transition-all"
          >
            ✓ {tt('confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
