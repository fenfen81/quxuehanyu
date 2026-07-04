import sys, re, zipfile
import xml.etree.ElementTree as ET

docx_path = r'D:/我的外国学生的汉语教学相关资料/steven（俄罗斯）汉语教学相关文件/《汉语教程》1下-全部生词表-带中英文例句.docx'

# Read the docx as a ZIP file
with zipfile.ZipFile(docx_path, 'r') as z:
    xml_content = z.read('word/document.xml')

# Parse XML
root = ET.fromstring(xml_content)

# Define namespaces
ns = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
}

def get_cell_text(cell):
    """Extract text from a table cell element"""
    texts = []
    for p in cell.findall('.//w:p', ns):
        para_text = ''
        for r in p.findall('.//w:r', ns):
            for t in r.findall('.//w:t', ns):
                if t.text:
                    para_text += t.text
        texts.append(para_text.strip())
    return ' '.join(texts).strip()

def get_paragraph_text(p):
    """Extract text from a paragraph element"""
    para_text = ''
    for r in p.findall('.//w:r', ns):
        for t in r.findall('.//w:t', ns):
            if t.text:
                para_text += t.text
    return para_text.strip()

# Lesson titles mapping for 1下 (lessons 16-25)
# Using the actual titles from the textbook/docx
lesson_titles = {
    16: ('第十六课 你常去图书馆吗', 'Lesson 16'),
    17: ('第十七课 他在做什么呢', 'Lesson 17'),
    18: ('第十八课 我去超市买东西', 'Lesson 18'),
    19: ('第十九课 可以试试吗', 'Lesson 19'),
    20: ('第二十课 祝你生日快乐', 'Lesson 20'),
    21: ('第二十一课 我们明天七点一刻出发', 'Lesson 21'),
    22: ('第二十二课 我打算请老师教我京剧', 'Lesson 22'),
    23: ('第二十三课 学校里边有银行吗', 'Lesson 23'),
    24: ('第二十四课 我想学太极拳', 'Lesson 24'),
    25: ('第二十五课 她学得很好', 'Lesson 25'),
}

# Convert Chinese number to int
def cn_to_int(cn):
    num_map = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10}
    if cn == '十':
        return 10
    if len(cn) == 2 and cn[0] == '十':
        return 10 + num_map[cn[1]]
    if len(cn) == 2 and cn[1] == '十':
        return num_map[cn[0]] * 10
    if len(cn) == 3 and cn[1] == '十':
        return num_map[cn[0]] * 10 + num_map[cn[2]]
    return None

# Find all tables and paragraphs in document order
# We need to track which paragraphs come before each table to find lesson numbers
body = root.find('.//w:body', ns)
if body is None:
    print("ERROR: Could not find body element", file=sys.stderr)
    sys.exit(1)

# Collect all elements in order
current_lesson_num = None
lessons_data = {}

for elem in body:
    tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
    
    if tag == 'p':
        text = get_paragraph_text(elem)
        if text:
            # Check if this paragraph contains a lesson number
            m = re.search(r'第([一二三四五六七八九十]+)课', text)
            if m:
                num = cn_to_int(m.group(1))
                if num and 16 <= num <= 25:
                    current_lesson_num = num
                    print(f"Found lesson {num} from paragraph: {text[:50]}", file=sys.stderr)
    
    elif tag == 'tbl':
        # This is a table - parse it
        if current_lesson_num is None:
            # Try to find lesson number from first cell
            first_row = elem.find('.//w:tr', ns)
            if first_row:
                first_cell = first_row.find('.//w:tc', ns)
                if first_cell:
                    cell_text = get_cell_text(first_cell)
                    m = re.search(r'第([一二三四五六七八九十]+)课', cell_text)
                    if m:
                        num = cn_to_int(m.group(1))
                        if num and 16 <= num <= 25:
                            current_lesson_num = num
                    else:
                        m2 = re.search(r'(\d+)', cell_text)
                        if m2:
                            val = int(m2.group(1))
                            if 16 <= val <= 25:
                                current_lesson_num = val
        
        if current_lesson_num is None:
            continue
        
        # Parse rows
        rows = elem.findall('.//w:tr', ns)
        if not rows:
            continue
        
        # Check header row
        header = [get_cell_text(c) for c in rows[0].findall('.//w:tc', ns)]
        print(f"Lesson {current_lesson_num} table header ({len(header)} cols): {header}", file=sys.stderr)
        
        words = []
        word_idx = 0
        for r in range(1, len(rows)):
            cells = rows[r].findall('.//w:tc', ns)
            cell_texts = [get_cell_text(c) for c in cells]
            if len(cell_texts) < 7:
                continue
            # Skip empty rows
            if not cell_texts[1]:
                continue
            
            word_idx += 1
            word = {
                'id': f'l{current_lesson_num}-w{word_idx}',
                'hanzi': cell_texts[1],
                'pinyin': cell_texts[2],
                'pos': cell_texts[3],
                'english': cell_texts[4],
                'exampleCn': cell_texts[5],
                'exampleEn': cell_texts[6],
            }
            words.append(word)
        
        if words:
            if current_lesson_num not in lessons_data:
                lessons_data[current_lesson_num] = words
                print(f"Lesson {current_lesson_num}: {len(words)} words", file=sys.stderr)
            else:
                # Merge with existing (might be continuation of same lesson)
                lessons_data[current_lesson_num].extend(words)
                print(f"Lesson {current_lesson_num}: added {len(words)} more words (total {len(lessons_data[current_lesson_num])})", file=sys.stderr)
        
        # Reset lesson number for next table (in case the next paragraph doesn't have it)
        # Actually keep it, in case a lesson has multiple tables

# Generate TS code
lines = []
lines.append('  {')
lines.append("    textbookId: 'hanyu-jiaocheng-1b',")
lines.append("    title: '《汉语教程》第一册（下）',")
lines.append("    titleEn: 'Chinese Course Vol.1B',")
lines.append("    categoryId: 'comprehensive',")
lines.append('    lessons: [')

for lesson_num in sorted(lessons_data.keys()):
    words = lessons_data[lesson_num]
    title_zh, title_en = lesson_titles[lesson_num]
    lines.append('      {')
    lines.append(f"        lessonId: 'lesson{lesson_num}',")
    lines.append(f'        lessonNum: {lesson_num},')
    safe_title = title_zh.replace("'", "\\'")
    lines.append(f"        lessonTitle: '{safe_title}',")
    lines.append(f"        lessonTitleEn: '{title_en}',")
    lines.append('        words: [')
    
    for w in words:
        # Escape problematic characters for TS single-quoted strings
        pinyin = w['pinyin'].replace("\\", "\\\\").replace("'", "\\'")
        pinyin = pinyin.replace('\u2019', '\\u2019')  # right single quotation mark
        english = w['english'].replace("\\", "\\\\").replace("'", "\\'")
        example_cn = w['exampleCn'].replace("\\", "\\\\").replace("'", "\\'")
        example_en = w['exampleEn'].replace("\\", "\\\\").replace("'", "\\'")
        hanzi = w['hanzi'].replace("\\", "\\\\").replace("'", "\\'")
        pos = w['pos'].replace("\\", "\\\\").replace("'", "\\'")
        
        lines.append('          {')
        lines.append(f"            id: '{w['id']}',")
        lines.append(f"            hanzi: '{hanzi}',")
        lines.append(f"            pinyin: '{pinyin}',")
        lines.append(f"            pos: '{pos}',")
        lines.append(f"            english: '{english}',")
        lines.append(f"            exampleCn: '{example_cn}',")
        lines.append(f"            exampleEn: '{example_en}',")
        lines.append('          },')
    
    lines.append('        ],')
    lines.append('      },')

lines.append('    ],')
lines.append('  },')

# Output the TS code to file in UTF-8
output = '\n'.join(lines)
with open(r'C:\ProgramData\WorkBuddy\chromium-env\1365jvd\WorkBuddy\2026-06-16-11-47-45\app\textbook_1b_output.txt', 'w', encoding='utf-8') as f:
    f.write(output)

# Also output stats
total = sum(len(w) for w in lessons_data.values())
print(f"\n// Total: {len(lessons_data)} lessons, {total} words", file=sys.stderr)
