// 生词表打印 / 导出 PDF（不引入第三方库：生成打印友好 HTML + window.print）
// 参考「炭炭背单词」的四种表格模式：
//   full               中英词表（全部显示）
//   dictation-word     默写单词（汉字列留空，看拼音/释义写汉字）
//   dictation-meaning  默写释义（英文列留空，看汉字写英文）
//   ebbinghaus         艾宾浩斯（含 D1/D2/D3/D5/D8/D16 复习打卡格）

export type VocabPrintMode = 'full' | 'dictation-word' | 'dictation-meaning' | 'ebbinghaus'

export interface VocabPrintWord {
  hanzi: string
  pinyin?: string
  pos?: string
  english?: string
  /** 例词/例句（可选，用于「含例句」选项） */
  exampleCn?: string
  exampleEn?: string
}

export interface VocabPrintOptions {
  mode: VocabPrintMode
  /** 显示拼音 */
  showPinyin: boolean
  /** 显示词性 */
  showPos: boolean
  /** 显示例句 */
  showExample: boolean
  /** 列数：1 或 2 */
  columns: 1 | 2
  /** 大标题（如教材名） */
  title: string
  /** 副标题（如「第3课 / 共 42 词」） */
  subtitle?: string
  /** 主题色 */
  accent?: string
  /** 页脚署名 */
  footer?: string
}

const ACCENTS: Record<string, string> = {
  indigo: '#4f46e5', teal: '#0d9488', orange: '#ea580c',
  rose: '#e11d48', slate: '#475569', ink: '#111827',
}
export const VOCAB_ACCENT_KEYS = Object.keys(ACCENTS)

function esc(s: string | undefined): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Col {
  key: string; label: string; width: string; blank?: boolean
}

function buildColumns(opt: VocabPrintOptions): Col[] {
  const cols: Col[] = []
  // 汉字列：默写单词模式下留空
  cols.push({ key: 'hanzi', label: '汉字', width: '16%', blank: opt.mode === 'dictation-word' })
  if (opt.showPinyin) cols.push({ key: 'pinyin', label: '拼音', width: '18%' })
  if (opt.showPos) cols.push({ key: 'pos', label: '词性', width: '7%' })
  // 释义列：默写释义模式下留空
  cols.push({ key: 'english', label: '释义', width: '26%', blank: opt.mode === 'dictation-meaning' })
  if (opt.showExample) cols.push({ key: 'example', label: '例句', width: '33%' })
  return cols
}

function cellHtml(w: VocabPrintWord, col: Col): string {
  if (col.blank) return '<div class="blank"></div>'
  switch (col.key) {
    case 'hanzi': return `<span class="hz">${esc(w.hanzi)}</span>`
    case 'pinyin': return `<span class="py">${esc(w.pinyin)}</span>`
    case 'pos': return `<span class="pos">${esc(w.pos)}</span>`
    case 'english': return `<span class="en">${esc(w.english)}</span>`
    case 'example': {
      const parts: string[] = []
      if (w.exampleCn) parts.push(`<span class="excn">${esc(w.exampleCn)}</span>`)
      if (w.exampleEn) parts.push(`<span class="exen">${esc(w.exampleEn)}</span>`)
      return parts.join('<br/>') || ''
    }
    default: return ''
  }
}

function tableHtml(words: VocabPrintWord[], startNo: number, opt: VocabPrintOptions): string {
  const cols = buildColumns(opt)
  const eb = opt.mode === 'ebbinghaus'
  const REV = ['D1', 'D2', 'D3', 'D5', 'D8', 'D16']
  const ths = cols.map((c) => `<th style="width:${c.width}">${c.label}</th>`).join('')
  const head = `<tr><th class="no" style="width:5%">NO.</th>${ths}${eb ? `<th class="rev" colspan="6">复习 Review</th>` : ''}</tr>` +
    (eb ? '<tr class="subhead"><th class="no"></th>' + cols.map(() => '<th></th>').join('') + REV.map((d) => `<th class="rev">${d}</th>`).join('') + '</tr>' : '')
  const rows = words.map((w, i) => {
    const tds = cols.map((c) => `<td>${cellHtml(w, c)}</td>`).join('')
    const rev = eb ? REV.map(() => '<td class="rev"><span class="box"></span></td>').join('') : ''
    return `<tr><td class="no">${startNo + i}</td>${tds}${rev}</tr>`
  }).join('\n')
  return `<table>
<thead>
${head}
</thead>
<tbody>
${rows}
</tbody>
</table>`
}

export function buildVocabPrintHtml(words: VocabPrintWord[], opt: VocabPrintOptions): string {
  const accent = ACCENTS[opt.accent || 'indigo'] || ACCENTS.indigo
  const date = new Date().toLocaleDateString('zh-CN')
  const modeLabel: Record<VocabPrintMode, string> = {
    'full': '中英词表',
    'dictation-word': '默写单词',
    'dictation-meaning': '默写释义',
    'ebbinghaus': '艾宾浩斯复习表',
  }

  let body = ''
  if (opt.columns === 2) {
    const half = Math.ceil(words.length / 2)
    const left = words.slice(0, half)
    const right = words.slice(half)
    body = `<div class="cols2">
  <div>${tableHtml(left, 1, opt)}</div>
  <div>${tableHtml(right, half + 1, opt)}</div>
</div>`
  } else {
    body = tableHtml(words, 1, opt)
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${esc(opt.title)} - ${modeLabel[opt.mode]}</title>
<style>
  @page { size: A4 portrait; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #1e293b; font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif; background: #fff; }
  .hd { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid ${accent}; padding-bottom: 6px; margin-bottom: 10px; }
  .hd h1 { margin: 0; font-size: 20px; color: ${accent}; letter-spacing: .5px; }
  .hd .sub { font-size: 12px; color: #64748b; margin-top: 3px; }
  .hd .right { font-size: 11px; color: #94a3b8; text-align: right; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
  th { background: ${accent}; color: #fff; padding: 5px 6px; border: 1px solid ${accent}; font-weight: 600; text-align: left; }
  th.no, td.no { text-align: center; color: #64748b; }
  th.rev, td.rev { text-align: center; }
  tr.subhead th { background: #f1f5f9; color: ${accent}; font-weight: 600; padding: 2px 4px; font-size: 10px; }
  td { border: 1px solid #cbd5e1; padding: 5px 6px; vertical-align: top; word-break: break-word; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  .hz { font-size: 13px; font-weight: 600; }
  .py { color: ${accent}; }
  .pos { color: #64748b; font-size: 10px; }
  .en { color: #334155; }
  .excn { color: #475569; }
  .exen { color: #94a3b8; font-size: 10px; }
  .blank { height: 14px; }
  .box { display: inline-block; width: 16px; height: 12px; border: 1px solid #94a3b8; border-radius: 2px; }
  .cols2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .ft { margin-top: 10px; padding-top: 6px; border-top: 1px dashed #cbd5e1; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
  .bar { position: sticky; top: 0; background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 14px; display: flex; gap: 10px; align-items: center; font-size: 13px; }
  .bar button { background: ${accent}; color: #fff; border: 0; padding: 8px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; font-weight: 600; }
  .bar span { color: #64748b; }
  @media print { .bar { display: none !important; } body { padding: 0; } }
  @media screen { body { padding: 14px 18px; } }
</style>
</head>
<body>
<div class="bar"><button onclick="window.print()">🖨 打印 / 另存为 PDF</button><span>共 ${words.length} 词 · 打印时请选择「纵向 A4」并勾选「背景图形」以保留表头颜色</span></div>
<div class="hd">
  <div>
    <h1>Vocabulary List · ${modeLabel[opt.mode]}</h1>
    <div class="sub">${esc(opt.title)}${opt.subtitle ? ' · ' + esc(opt.subtitle) : ''}</div>
  </div>
  <div class="right">${date}<br/>共 ${words.length} 词</div>
</div>
${body}
<div class="ft"><span>${esc(opt.footer || '趣学汉语 quxuehanyu.com')}</span><span>姓名：__________　得分：________</span></div>
</body>
</html>`
}

/** 打开新窗口并触发打印（在用户点击事件中调用，避免被拦截） */
export function printVocabList(words: VocabPrintWord[], opt: VocabPrintOptions) {
  const html = buildVocabPrintHtml(words, opt)
  const w = window.open('', '_blank', 'width=980,height=1200')
  if (!w) {
    alert('浏览器拦截了新窗口，请允许本站弹出窗口后重试')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
}
