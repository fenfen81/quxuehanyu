# -*- coding: utf-8 -*-
"""
重新生成 HSK5（上）课文块并替换 content.ts 中已有的 hsk-standard-5 块。
- 数据源：hsk5_data.json（含带回标点的 split + 更完整 dict）
- 通过括号匹配（向后找开括号 / 向前找闭括号）精确定位旧块，整体替换
"""
import json

DATA = 'hsk5_data.json'
CONTENT = 'src/data/content.ts'

with open(DATA, encoding='utf-8') as f:
    texts_obj = json.load(f)


def unescape(s):
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

tb_ts = '  ' + emit(textbook, 0).replace('\n', '\n  ')

with open(CONTENT, encoding='utf-8') as f:
    content = f.read()

marker = '"id": "hsk-standard-5"'
i = content.find(marker)
if i < 0:
    print('ERROR: hsk-standard-5 block not found')
    raise SystemExit(1)

# 向后走找包含该 marker 的对象开括号 '{'
depth = 0
start = i
k = i
while k >= 0:
    ch = content[k]
    if ch == '}':
        depth += 1
    elif ch == '{':
        if depth == 0:
            start = k
            break
        depth -= 1
    k -= 1

# 向前走找匹配的闭括号 '}'
depth = 0
j = start
while j < len(content):
    c = content[j]
    if c == '{':
        depth += 1
    elif c == '}':
        depth -= 1
        if depth == 0:
            break
    j += 1
end = j

comma = content[end + 1:end + 2] == ','
remove_end = end + 2 if comma else end + 1
new_block = tb_ts + (',' if comma else '')

new_content = content[:start] + new_block + content[remove_end:]

with open(CONTENT, 'w', encoding='utf-8') as f:
    f.write(new_content)

total = sum(len(t['sentences']) for t in texts_obj)
print(f'REPLACED hsk-standard-5 block. Lessons: {len(lessons)}, Sentences: {total}, trailing_comma={comma}')
print(f'block span: [{start}, {end}]')
