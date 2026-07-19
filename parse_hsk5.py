# -*- coding: utf-8 -*-
"""
Phase A: 解析《HSK标准教程》第5册（上）docx
  -> 每课句子 (cn, en, split[jieba分词], dict[hskWords+pypinyin])
  -> 写出 hsk5_data.json 并打印统计，不直接改 content.ts
"""
import zipfile, re, json
from xml.etree import ElementTree as ET
import jieba
from pypinyin import pinyin, Style

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
DOCX = r'D:/趣学汉语网站制作相关文件/我制作趣学汉语网站所需的一些教材材料/《HSK标准教程》第5册（上）的课文原文-带拼音.docx'

jieba.setLogLevel(20)

# ── 加载 hskWords.ts -> hanzi -> (pinyin, english) ──
print('Loading hskWords.ts ...')
hsk = {}
with open('src/data/hskWords.ts', encoding='utf-8') as f:
    for line in f:
        m = re.search(
            r"hanzi:\s*'(?P<hanzi>[^']*)'\s*,\s*"
            r"pinyin:\s*'(?P<pinyin>(?:[^'\\]|\\.)*)'\s*,\s*"
            r"english:\s*'(?P<english>(?:[^'\\]|\\.)*)'",
            line)
        if m:
            hsk[m.group('hanzi')] = (m.group('pinyin'), m.group('english'))
print(f'  hskWords entries: {len(hsk)}')

def word_pinyin(w):
    return ''.join(x[0] for x in pinyin(w, style=Style.TONE, heteronym=False))

def is_punct(tok):
    return not re.search(r'[\u4e00-\u9fffA-Za-z0-9]', tok)

# ── 解析 docx ──
def para_text(p):
    return ''.join(
        t.text for r in p.iter(f'{{{W}}}r') for t in r.iter(f'{{{W}}}t') if t.text
    ).strip()

def row_cells(tr):
    cells = []
    for tc in tr.iter(f'{{{W}}}tc'):
        ctext = [para_text(p) for p in tc.findall(f'{{{W}}}p')]
        cells.append(' | '.join(ctext).strip())
    return cells

print('Parsing docx ...')
with zipfile.ZipFile(DOCX, 'r') as z:
    root = ET.fromstring(z.read('word/document.xml').decode('utf-8'))

lessons = []
cur = None
lesson_re = re.compile(r'^第[一二三四五六七八九十百零0-9]+课')

for el in root.iter():
    tag = el.tag
    if tag == f'{{{W}}}p':
        txt = para_text(el)
        if not txt:
            continue
        if lesson_re.match(txt):
            cur = {'title': txt, 'sentences': []}
            lessons.append(cur)
    elif tag == f'{{{W}}}tr':
        cells = row_cells(el)
        if len(cells) < 4:
            continue
        num, py, cn, en = cells[0], cells[1], cells[2], cells[3]
        if num == '序号' and cn == '原文':
            continue  # 列标题行
        if not cn or not en or not num.isdigit():
            continue
        if cur is None:
            continue
        cur['sentences'].append({'num': num, 'pinyin': py, 'cn': cn, 'en': en})

# ── 分词 + 构建 dict ──
print('Segmenting & building dict ...')
texts_obj = []
for li, lesson in enumerate(lessons, 1):
    sentences = []
    for si, s in enumerate(lesson['sentences'], 1):
        cn = s['cn']
        seg = [w for w in jieba.cut(cn) if not is_punct(w)]
        split = ' '.join(seg)
        # dict：每个分词查 hskWords，否则 pypinyin 兜底
        d = {}
        for w in seg:
            if w in d:
                continue
            if w in hsk:
                py, en = hsk[w]
                d[w] = f'{py} / {en}' if en else py
            else:
                d[w] = word_pinyin(w)
        sentences.append({
            'id': f'hsk5-l{li}n{si}',
            'cn': cn,
            'split': split,
            'en': s['en'],
            'dict': d,
        })
    texts_obj.append({
        'lesson_title': lesson['title'],
        'lesson_id': f'hsk5-lesson{li}',
        'sentences': sentences,
    })

# ── 统计 ──
total = sum(len(t['sentences']) for t in texts_obj)
print('=' * 60)
print(f'Lessons: {len(texts_obj)}, Sentences: {total}')
for t in texts_obj:
    print(f"  {t['lesson_title']}  ->  {len(t['sentences'])} 句")
print('=' * 60)
# 样本输出（前 2 课各 1 句）
for t in texts_obj[:2]:
    s = t['sentences'][0]
    print(f"\n[{t['lesson_title']}] {s['id']}")
    print(f"  cn:   {s['cn']}")
    print(f"  en:   {s['en']}")
    print(f"  split:{s['split']}")
    print(f"  dict: {list(s['dict'].items())[:6]}")

with open('hsk5_data.json', 'w', encoding='utf-8') as f:
    json.dump(texts_obj, f, ensure_ascii=False, indent=1)
print('\nWrote hsk5_data.json')
