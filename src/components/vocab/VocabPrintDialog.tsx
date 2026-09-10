import { useMemo, useState } from 'react'
import { buildVocabPrintHtml, printVocabList, VOCAB_ACCENT_KEYS, type VocabPrintMode, type VocabPrintWord } from '@/lib/vocabPrint'
import { t, type Lang } from '@/i18n/translations'

interface Props {
  words: VocabPrintWord[]
  title: string
  subtitle?: string
  lang: Lang
  onClose: () => void
}

const MODES: { key: VocabPrintMode; zh: string; en: string; hintZh: string; hintEn: string }[] = [
  { key: 'full', zh: '中英词表', en: 'Full List', hintZh: '汉字、拼音、释义全显示，适合复习和背诵', hintEn: 'Show everything — good for review' },
  { key: 'dictation-word', zh: '默写单词', en: 'Dictate Hanzi', hintZh: '汉字列留空，看拼音和释义写汉字', hintEn: 'Hanzi hidden — write it from pinyin & meaning' },
  { key: 'dictation-meaning', zh: '默写释义', en: 'Dictate Meaning', hintZh: '释义列留空，看汉字写英文', hintEn: 'Meaning hidden — write it from Hanzi' },
  { key: 'ebbinghaus', zh: '艾宾浩斯', en: 'Ebbinghaus', hintZh: '带 D1/D2/D3/D5/D8/D16 复习打卡格，适合长期记忆', hintEn: 'With D1–D16 review checkboxes' },
]

const ACCENT_STYLE: Record<string, string> = {
  indigo: '#4f46e5', teal: '#0d9488', orange: '#ea580c',
  rose: '#e11d48', slate: '#475569', ink: '#111827',
}

export function VocabPrintDialog({ words, title, subtitle, lang, onClose }: Props) {
  const [mode, setMode] = useState<VocabPrintMode>('full')
  const [showPinyin, setShowPinyin] = useState(true)
  const [showPos, setShowPos] = useState(false)
  const [showExample, setShowExample] = useState(false)
  const [columns, setColumns] = useState<1 | 2>(1)
  const [accent, setAccent] = useState('indigo')

  const opt = useMemo(() => ({
    mode, showPinyin, showPos, showExample, columns, accent, title, subtitle,
  }), [mode, showPinyin, showPos, showExample, columns, accent, title, subtitle])

  const previewHtml = useMemo(() => buildVocabPrintHtml(words, opt), [words, opt])

  const btn = (on: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${on
      ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
      : 'bg-white text-slate-400 border-slate-200'}`
  const seg = (on: boolean) =>
    `px-3 py-1.5 text-xs font-semibold transition-all ${on ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="font-bold text-slate-800">{t('vocab_print_title', lang)}</div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100">✕</button>
        </div>

        <div className="flex-1 grid lg:grid-cols-[320px_1fr] min-h-0">
          {/* 左：设置 */}
          <div className="p-4 space-y-4 overflow-y-auto border-r border-slate-100">
            <div>
              <div className="text-xs font-bold text-slate-400 mb-2">表格类型</div>
              <div className="grid grid-cols-2 gap-2">
                {MODES.map((m) => (
                  <button key={m.key} onClick={() => setMode(m.key)}
                    className={`px-3 py-2 rounded-xl border text-left transition-all ${mode === m.key
                      ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className={`text-sm font-semibold ${mode === m.key ? 'text-indigo-700' : 'text-slate-700'}`}>
                      {lang === 'zh' ? m.zh : m.en}
                    </div>
                    <div className="text-[10px] leading-snug text-slate-400 mt-0.5">{lang === 'zh' ? m.hintZh : m.hintEn}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-400 mb-2">显示内容</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowPinyin((v) => !v)} className={btn(showPinyin)}>
                  {showPinyin ? '🈶' : '🙈'} 拼音
                </button>
                <button onClick={() => setShowPos((v) => !v)} className={btn(showPos)}>
                  {showPos ? '🏷' : '🙈'} 词性
                </button>
                <button onClick={() => setShowExample((v) => !v)} className={btn(showExample)}>
                  {showExample ? '💬' : '🙈'} 例句
                </button>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-400 mb-2">排版</div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                  <button onClick={() => setColumns(1)} className={seg(columns === 1)}>1 列</button>
                  <button onClick={() => setColumns(2)} className={`${seg(columns === 2)} border-l border-slate-200`}>2 列</button>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-400 mb-2">主题色</div>
              <div className="flex gap-2">
                {VOCAB_ACCENT_KEYS.map((k) => (
                  <button key={k} onClick={() => setAccent(k)} title={k}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${accent === k ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                    style={{ background: ACCENT_STYLE[k] }} />
                ))}
              </div>
            </div>

            <div className="pt-1 text-[11px] text-slate-400 leading-relaxed">
              导出后在打印窗口选择「<b>另存为 PDF</b>」即可得到 PDF 文件；<br />
              打印时建议勾选「背景图形」以保留表头颜色。
            </div>
          </div>

          {/* 右：实时预览 */}
          <div className="bg-slate-100 min-h-0 flex flex-col">
            <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-200 flex items-center justify-between">
              <span>预览（A4 纵向 · 共 {words.length} 词）</span>
              <span className="text-slate-400">仅示意，以打印结果为准</span>
            </div>
            <iframe title="vocab-print-preview" srcDoc={previewHtml} className="flex-1 w-full bg-white" />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400 truncate">{title}{subtitle ? ` · ${subtitle}` : ''}</div>
          <div className="flex gap-2 shrink-0">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50">
              {t('cancel', lang)}
            </button>
            <button onClick={() => printVocabList(words, opt)}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all">
              🖨 {t('vocab_print_action', lang)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
