import zipfile, re
from xml.etree import ElementTree as ET

DOCX = r"E:/我的教学资料/趣学汉语网站制作相关文件/我制作趣学汉语网站所需的一些教材材料/《汉语教程》第二册（上）的相关文件/第2课 玛丽哭了-课文原文及翻译.docx"

ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
z = zipfile.ZipFile(DOCX)
xml = z.read('word/document.xml')
root = ET.fromstring(xml)

paragraphs = []
for p in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
    texts = []
    for t in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
        if t.text:
            texts.append(t.text)
    line = ''.join(texts)
    paragraphs.append(line)

# Print non-empty lines with index
for i, line in enumerate(paragraphs):
    if line.strip():
        print(f"[{i}] {line}")
