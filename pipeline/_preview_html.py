#!/usr/bin/env python
# -*- coding: utf-8 -*-
# 把第一课 book.enriched.json 渲染成可预览的 HTML（浅蓝背景 / 卡片 / 大字体）
import json, html, os

ENRICH = r"C:/ProgramData/WorkBuddy/chromium-env/1365jvd/WorkBuddy/2026-06-16-11-47-45/app/pipeline/books/hanyu-jiaocheng-2a/book.enriched.json"
OUT = r"C:/ProgramData/WorkBuddy/chromium-env/1365jvd/WorkBuddy/2026-06-16-11-47-45/app/pipeline/books/hanyu-jiaocheng-2a/lesson1_preview.html"

book = json.load(open(ENRICH, encoding='utf-8'))
L = book['lessons'][0]

def esc(s): return html.escape(str(s or ''))

sent_cards = ''
for ti, t in enumerate(L['texts']):
    rows = ''
    for s in t['sentences']:
        dict_html = ''
        if s.get('dict'):
            items = []
            for k, v in s['dict'].items():
                items.append(f'<span class="w"><b>{esc(k)}</b><i>{esc(v)}</i></span>')
            dict_html = '<div class="dict">' + ''.join(items) + '</div>'
        rows += f'''<div class="sent">
  <div class="cn">{esc(s['cn'])}</div>
  <div class="en">{esc(s['en'])}</div>
  {dict_html}
</div>'''
    sent_cards += f'<section class="card"><h2>{esc(t["label"])}</h2>{rows}</section>'

vocab_rows = ''
for w in L['words']:
    vocab_rows += f'''<tr>
  <td class="hz">{esc(w['hanzi'])}</td>
  <td class="py">{esc(w.get('pinyin',''))}</td>
  <td class="pos">{esc(w.get('pos',''))}</td>
  <td class="en">{esc(w.get('english',''))}</td>
  <td class="ex">{esc(w.get('exampleCn',''))}<br><span class="exen">{esc(w.get('exampleEn',''))}</span></td>
</tr>'''

doc = f'''<!doctype html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(L['lessonTitle'])} · 导入预览</title>
<style>
  body{{margin:0;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;
    background:linear-gradient(180deg,#eaf4ff,#f7fbff);color:#1f2d3d;padding:28px;}}
  h1{{font-size:30px;margin:0 0 4px;color:#0b5cab;}}
  .sub{{color:#5b7a99;margin-bottom:22px;font-size:15px;}}
  .card{{background:#fff;border:1px solid #d4e6fb;border-radius:16px;padding:20px 22px;
    margin-bottom:22px;box-shadow:0 6px 18px rgba(20,90,180,.08);}}
  h2{{font-size:21px;margin:0 0 14px;color:#0b5cab;border-left:5px solid #4d9bff;padding-left:10px;}}
  .sent{{padding:12px 0;border-bottom:1px dashed #e3edf7;}}
  .sent:last-child{{border-bottom:none;}}
  .cn{{font-size:23px;font-weight:600;line-height:1.5;}}
  .en{{font-size:16px;color:#557;margin-top:2px;}}
  .dict{{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;}}
  .dict .w{{background:#f0f6ff;border:1px solid #d4e6fb;border-radius:8px;padding:3px 8px;
    font-size:13px;display:flex;flex-direction:column;align-items:center;min-width:42px;}}
  .dict .w b{{font-size:15px;color:#0b5cab;}}
  .dict .w i{{font-style:normal;color:#789;font-size:11px;}}
  table{{width:100%;border-collapse:collapse;font-size:15px;}}
  th,td{{border-bottom:1px solid #e3edf7;padding:10px 8px;text-align:left;vertical-align:top;}}
  th{{background:#f0f6ff;color:#0b5cab;font-size:14px;}}
  .hz{{font-size:20px;font-weight:700;color:#0b5cab;white-space:nowrap;}}
  .py{{color:#3a7bd5;}}
  .pos{{color:#a07b00;}}
  .ex{{font-size:15px;}}.exen{{color:#789;font-size:13px;}}
  .stat{{display:inline-block;background:#e3f0ff;color:#0b5cab;border-radius:20px;
    padding:6px 14px;font-size:14px;margin-right:8px;}}
</style></head><body>
<h1>{esc(L['lessonTitle'])}</h1>
<div class="sub">{esc(book['title'])} · 导入预览（数据已写入 content.ts / textbookDict.ts，tsc 通过）</div>
<div style="margin-bottom:18px;">
  <span class="stat">课文 {sum(len(t['sentences']) for t in L['texts'])} 句</span>
  <span class="stat">生词 {len(L['words'])} 个</span>
  <span class="stat">bookCode: {esc(book['bookCode'])}</span>
</div>
{sent_cards}
<section class="card"><h2>生词表（{esc(L['lessonTitle'])}）</h2>
<table><thead><tr><th>汉字</th><th>拼音</th><th>词性</th><th>英文</th><th>例句</th></tr></thead>
<tbody>{vocab_rows}</tbody></table></section>
</body></html>'''

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w', encoding='utf-8').write(doc)
print("已生成预览:", OUT, "大小", len(doc), "字符")
