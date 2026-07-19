# -*- coding: utf-8 -*-
"""
Phase B: 读取 hsk5_data.json -> 构建 textbook 对象 -> 插入 content.ts
  - 正确转义引号/反斜杠（兼容 hskWords 中的 \' 源转义）
  - 幂等：若已存在 hsk-standard-5 则跳过
"""
import json

DATA = 'hsk5_data.json'
CONTENT = 'src/data/content.ts'

with open(DATA, encoding='utf-8') as f:
    texts_obj = json.load(f)

def unescape(s):
    # 还原 hskWords 源转义：\' -> ' ，\\ -> \
    return s.replace("\\'", "'").replace("\\\\", "\\")

def q(s):
    s = unescape(s)
    s = s.replace('\\', '\\\\').replace('"', '\\"')
    return '"' + s + '"'

def emit(obj, indent):
    pad = '  ' * indent
    if isinstance(obj, dict):
        if not obj:
            return '{}'
        items = [f'{pad}  {q(k)}: {emit(v, indent + 1)}' for k, v in obj.items()]
        return '{\n' + ',\n'.join(items) + '\n' + pad + '}'
    if isinstance(obj, list):
        if not obj:
            return '[]'
        items = [f'{pad}  {emit(v, indent + 1)}' for v in obj]
        return '[\n' + ',\n'.join(items) + '\n' + pad + ']'
    if isinstance(obj, bool):
        return 'true' if obj else 'false'
    if isinstance(obj, (int, float)):
        return str(obj)
    if isinstance(obj, str):
        return q(obj)
    return 'null'

# ── 构建 textbook 对象 ──
lessons = []
for li, t in enumerate(texts_obj, 1):
    sentences = [{
        'id': s['id'],
        'cn': s['cn'],
        'split': s['split'],
        'en': s['en'],
        'dict': s['dict'],
    } for s in t['sentences']]
    lessons.append({
        'id': f'hsk5-lesson{li}',
        'title': t['lesson_title'],
        'titleEn': f'Lesson {li}',
        'texts': [{
            'id': f'hsk5-l{li}',
            'label': '课文',
            'sentences': sentences,
        }],
    })

textbook = {
    'id': 'hsk-standard-5',
    'categoryId': 'hsk',
    'title': "《HSK标准教程》第五册（上）",
    'titleEn': "HSK Standard Course 5 (Part 1)",
    'level': 'HSK 5',
    'lessons': lessons,
}

# ── 插入 content.ts ──
with open(CONTENT, encoding='utf-8') as f:
    content = f.read()

if 'hsk-standard-5' in content:
    print('SKIP: hsk-standard-5 already present in content.ts')
else:
    idx = content.rfind('\n]')
    ctx = content[idx - 40:idx + 2]
    print('INSERTION CONTEXT:', repr(ctx))
    tb_ts = emit(textbook, 1)
    new_content = content[:idx].rstrip('\n') + '\n' + tb_ts + '\n]' + content[idx + 2:]
    with open(CONTENT, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('INSERTED hsk-standard-5 into content.ts')

total = sum(len(t['sentences']) for t in texts_obj)
print(f'Lessons: {len(lessons)}, Sentences: {total}')
