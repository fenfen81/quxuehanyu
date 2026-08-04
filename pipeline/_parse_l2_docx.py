import zipfile, re, json
from xml.etree import ElementTree as ET

DOCX = r"E:/我的教学资料/趣学汉语网站制作相关文件/我制作趣学汉语网站所需的一些教材材料/《汉语教程》第二册（上）的相关文件/第2课 玛丽哭了-课文原文及翻译.docx"

ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
z = zipfile.ZipFile(DOCX)
xml = z.read('word/document.xml')
root = ET.fromstring(xml)

paras = []
for p in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
    texts = []
    for t in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
        if t.text:
            texts.append(t.text)
    paras.append(''.join(texts))

# Keep only non-empty
paras = [p for p in paras if p.strip()]

# Find 课文 markers
def find_marker(keyword):
    for i, line in enumerate(paras):
        if keyword in line and ('课文' in line):
            return i
    return -1

idx1 = find_marker('课文一')
idx2 = find_marker('课文二')

def parse_sentences(start, end):
    """Each sentence group: [number, pinyin, cn, en]."""
    sentences = []
    i = start + 1
    # skip header lines (序号/拼音/原文/地道英文) - find first pure-digit line
    while i < end and not paras[i].strip().isdigit():
        i += 1
    while i < end:
        if i + 3 >= end:
            break
        num = paras[i].strip()
        pinyin = paras[i+1].strip()
        cn = paras[i+2].strip()
        en = paras[i+3].strip()
        if num.isdigit() and re.search(r'[\u4e00-\u9fff]', cn) and re.search(r'[a-zA-Z]', en):
            sentences.append({'cn': cn, 'en': en, 'pinyin': pinyin})
            i += 4
        else:
            i += 1
    return sentences

s1 = parse_sentences(idx1, idx2)
s2 = parse_sentences(idx2, len(paras))

print(f"课文一: {len(s1)} 句")
print(f"课文二: {len(s2)} 句")
print()
for j, s in enumerate(s1[:3]):
    print(f"  [{j+1}] {s['cn']}  |  {s['en']}")
print("  ...")
for j, s in enumerate(s2[:3]):
    print(f"  [{j+1}] {s['cn']}  |  {s['en']}")

# Save to intermediate json
out = {'lesson1': s1, 'lesson2': s2}
with open(r"C:/ProgramData/WorkBuddy/chromium-env/1365jvd/WorkBuddy/2026-06-16-11-47-45/app/pipeline/_l2_new_sentences.json", 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print("\nSaved to _l2_new_sentences.json")
