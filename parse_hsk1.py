# -*- coding: utf-8 -*-
"""
Parse HSK标准教程1 docx and generate TypeScript data for content.ts
"""
import zipfile, re, json
from xml.etree import ElementTree as ET

docx_path = r'D:/我的外国学生的汉语教学相关资料/我制作趣学汉语网站所需的一些教材材料/《HSK标准教程》第一册的课文原文-带拼音.docx'

with zipfile.ZipFile(docx_path, 'r') as z:
    xml = z.read('word/document.xml').decode('utf-8')

root = ET.fromstring(xml)
paragraphs = []
for p in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
    texts = []
    for r in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r'):
        for t in r.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
            if t.text:
                texts.append(t.text)
    line = ''.join(texts).strip()
    if line:
        paragraphs.append(line)

# ── Pinyin character detection ──
TONE_CHARS = set('āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹ')
def is_pinyin_char(c):
    return (c.isascii() and c.isalpha()) or c in TONE_CHARS

def split_pinyin_chinese(text):
    """Split interleaved pinyin-Chinese text into (pinyin, chinese) pairs."""
    pairs = []
    i = 0
    n = len(text)
    while i < n:
        # Skip leading spaces
        while i < n and text[i] == ' ':
            i += 1
        if i >= n:
            break
        if is_pinyin_char(text[i]):
            # Read pinyin segment (Latin + tone marks + spaces + ASCII punct)
            py_start = i
            while i < n and (is_pinyin_char(text[i]) or text[i] in " ,.?!:'"):
                i += 1
            pinyin = text[py_start:i].strip()
            # Skip spaces before Chinese
            while i < n and text[i] == ' ':
                i += 1
            # Read Chinese segment (until next pinyin char)
            cn_start = i
            while i < n and not is_pinyin_char(text[i]):
                i += 1
            chinese = text[cn_start:i].strip()
            if pinyin and chinese:
                pairs.append((pinyin, chinese))
        else:
            i += 1
    return pairs

# ── Parse lesson structure ──
lessons = []
current_lesson = None
current_scene = None

for para in paragraphs:
    # Lesson header: 第X课
    lesson_match = re.match(r'^第(.+?)课\s+(.+)$', para)
    if lesson_match:
        current_lesson = {
            'title': para,
            'scenes': []
        }
        lessons.append(current_lesson)
        continue

    # Scene header: 场景X
    scene_match = re.match(r'^场景\s*\d', para)
    if scene_match:
        current_scene = {
            'label': para,
            'sentences': []
        }
        current_lesson['scenes'].append(current_scene)
        continue

    # Content line (pinyin + Chinese)
    if current_scene:
        pairs = split_pinyin_chinese(para)
        for pinyin, chinese in pairs:
            current_scene['sentences'].append({
                'pinyin': pinyin,
                'cn': chinese
            })

# ── Print summary ──
total = 0
for i, lesson in enumerate(lessons):
    lesson_total = 0
    for scene in lesson['scenes']:
        lesson_total += len(scene['sentences'])
    total += lesson_total
    print(f"Lesson {i+1}: {lesson['title']} - {len(lesson['scenes'])} scenes, {lesson_total} sentences")

print(f"\nTotal: {len(lessons)} lessons, {total} sentences")

# ── Print all sentences ──
for i, lesson in enumerate(lessons):
    print(f"\n=== Lesson {i+1}: {lesson['title']} ===")
    for j, scene in enumerate(lesson['scenes']):
        print(f"  Scene {j+1}: {scene['label']}")
        for k, s in enumerate(scene['sentences']):
            print(f"    {k+1}. [{s['pinyin']}] {s['cn']}")

# ── Save to JSON ──
with open('hsk1_parsed.json', 'w', encoding='utf-8') as f:
    json.dump(lessons, f, ensure_ascii=False, indent=2)
print("\nSaved to hsk1_parsed.json")
