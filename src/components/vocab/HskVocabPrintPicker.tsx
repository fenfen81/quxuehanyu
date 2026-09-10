import { useMemo, useState } from 'react'
import { hskWords, type HskWord } from '../../data/hskWords'
import { genExample } from '../../data/examples'
import { VocabPrintDialog } from './VocabPrintDialog'
import type { VocabPrintWord } from '@/lib/vocabPrint'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

interface Props {
  defaultLevel: 1 | 2 | 3 | 4 | 5 | 6
  favIds: string[]
  wrongWords: HskWord[]
  lang: Lang
  onClose: () => void
}

type Source = 'all' | 'fav' | 'wrong' | 'custom'

const LEVELS: (1 | 2 | 3 | 4 | 5 | 6)[] = [1, 2, 3, 4, 5, 6]

/** HSK 生词表选择器：选等级 → 选来源（全部/收藏/错词/自选勾选）→ 进入打印设置 */
export function HskVocabPrintPicker({ defaultLevel, favIds, wrongWords, lang, onClose }: Props) {
  const [level, setLevel] = useState<1 | 2 | 3 | 4 | 5 | 6>(defaultLevel)
  const [source, setSource] = useState<Source>('all')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [showPrint, setShowPrint] = useState(false)

  const favSet = useMemo(() => new Set(favIds), [favIds])
  const levelWords = useMemo(() => hskWords.filter((w) => w.level === level), [level])
  const wrongSet = useMemo(() => new Set(wrongWords.map((w) => w.id)), [wrongWords])

  // 当前来源下可选的词
  const pool = useMemo(() => {
    if (source === 'fav') return levelWords.filter((w) => favSet.has(w.id))
    if (source === 'wrong') return levelWords.filter((w) => wrongSet.has(w.id))
    return levelWords
  }, [source, levelWords, favSet, wrongSet])

  const visible = useMemo(() => {
    const kw = q.trim().toLowerCase()
    if (!kw) return pool
    return pool.filter((w) =>
      w.hanzi.includes(kw) ||
      w.pinyin.toLowerCase().includes(kw) ||
      w.english.toLowerCase().includes(kw))
  }, [pool, q])

  const selectedWords = useMemo(() => {
    if (source === 'custom') return levelWords.filter((w) => picked.has(w.id))
    return pool
  }, [source, levelWords, pool, picked])

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toPrintWords = (ws: HskWord[]): VocabPrintWord[] => ws.map((w) => {
    const ex = genExample(w)
    return {
      hanzi: w.hanzi, pinyin: w.pinyin, pos: w.posCn || w.pos,
      english: w.english, exampleCn: ex?.cn, exampleEn: ex?.en,
    }
  })

  const chip = (on: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${on
      ? 'bg-indigo-600 text-white border-indigo-600'
      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div className="font-bold text-slate-800">{lang === 'zh' ? '选择要打印的 HSK 生词' : 'Select HSK words to print'}</div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100">✕</button>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto">
            {/* 等级 */}
            <div>
              <div className="text-xs font-bold text-slate-400 mb-2">{lang === 'zh' ? '等级' : 'Level'}</div>
              <div className="flex gap-2 flex-wrap">
                {LEVELS.map((l) => (
                  <button key={l} onClick={() => { setLevel(l); setPicked(new Set()) }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${level === l
                      ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                    HSK{l}
                    <span className="ml-1 opacity-70">{hskWords.filter((w) => w.level === l).length}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 来源 */}
            <div>
              <div className="text-xs font-bold text-slate-400 mb-2">{lang === 'zh' ? '范围' : 'Range'}</div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSource('all')} className={chip(source === 'all')}>
                  {lang === 'zh' ? '全部' : 'All'}
                </button>
                <button onClick={() => setSource('fav')} className={chip(source === 'fav')}>
                  ⭐ {lang === 'zh' ? '收藏词' : 'Favorites'} · {levelWords.filter((w) => favSet.has(w.id)).length}
                </button>
                <button onClick={() => setSource('wrong')} className={chip(source === 'wrong')}>
                  ❌ {lang === 'zh' ? '错词本' : 'Wrong'} · {levelWords.filter((w) => wrongSet.has(w.id)).length}
                </button>
                <button onClick={() => setSource('custom')} className={chip(source === 'custom')}>
                  ✏️ {lang === 'zh' ? '自选（勾选）' : 'Pick manually'}
                </button>
              </div>
            </div>

            {/* 自选列表 */}
            {source === 'custom' && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input value={q} onChange={(e) => setQ(e.target.value)}
                    placeholder={lang === 'zh' ? '搜索汉字/拼音/英文' : 'Search hanzi / pinyin / English'}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-300" />
                  <button onClick={() => setPicked(new Set(pool.map((w) => w.id)))}
                    className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50">
                    {lang === 'zh' ? '全选' : 'All'}
                  </button>
                  <button onClick={() => setPicked(new Set())}
                    className="px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50">
                    {lang === 'zh' ? '清空' : 'Clear'}
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-xl">
                  <ul className="divide-y divide-slate-50">
                    {visible.map((w) => (
                      <li key={w.id}>
                        <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50">
                          <input type="checkbox" checked={picked.has(w.id)} onChange={() => toggle(w.id)}
                            className="w-4 h-4 accent-indigo-600" />
                          <span className="w-16 font-black text-slate-800 font-kai">{w.hanzi}</span>
                          <span className="w-24 text-xs text-indigo-600 truncate">{w.pinyin}</span>
                          <span className="flex-1 text-xs text-slate-500 truncate">{w.english}</span>
                        </label>
                      </li>
                    ))}
                    {visible.length === 0 && (
                      <li className="py-8 text-center text-sm text-slate-400">{t('tb_empty_filter', lang)}</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            <div className="text-xs text-slate-500 pt-1">
              {lang === 'zh'
                ? `已选 ${selectedWords.length} 词（HSK${level}）`
                : `${selectedWords.length} words selected (HSK${level})`}
            </div>
          </div>

          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50">
              {t('cancel', lang)}
            </button>
            <button disabled={selectedWords.length === 0} onClick={() => setShowPrint(true)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${selectedWords.length === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
              {lang === 'zh' ? '下一步：打印设置' : 'Next: print settings'} →
            </button>
          </div>
        </div>
      </div>

      {showPrint && (
        <VocabPrintDialog
          words={toPrintWords(selectedWords)}
          title={`HSK${level} ${lang === 'zh' ? '生词表' : 'Vocabulary'}`}
          subtitle={`${source === 'fav' ? (lang === 'zh' ? '收藏词' : 'Favorites') : source === 'wrong' ? (lang === 'zh' ? '错词本' : 'Wrong words') : source === 'custom' ? (lang === 'zh' ? '自选' : 'Selected') : (lang === 'zh' ? '全部' : 'All')} · ${selectedWords.length} 词`}
          lang={lang}
          onClose={() => setShowPrint(false)}
        />
      )}
    </>
  )
}
