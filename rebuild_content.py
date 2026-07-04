#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一次性修复 content.ts：从 HTML demo 文件直接提取数据，生成完整的 content.ts
"""
import json
import re
import sys
import os

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = 'D:/我的外国学生的汉语教学相关资料'

def extract_alllesson(html_path):
    """从 HTML 文件提取 allLesson 数据"""
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 查找 allLesson = { ... };
    match = re.search(r'(?:const|var|let)\s+allLesson\s*=\s*(\{.*?\});', content, re.DOTALL)
    if not match:
        # 查找 questionList = [ ... ]
        match = re.search(r'(?:const|var|let)\s+questionList\s*=\s*(\[.*?\]);', content, re.DOTALL)
        if match:
            js_str = '{"lesson1":' + match.group(1) + '}'
        else:
            raise ValueError(f"找不到数据: {html_path}")
    else:
        js_str = match.group(1)

    # JS 对象 → 合法 JSON
    js_str = re.sub(r'(\w+)\s*:', r'"\1":', js_str)
    js_str = re.sub(r'""(\w+)"":', r'"\1":', js_str)
    js_str = re.sub(r',\s*([}\]])', r'\1', js_str)
    js_str = js_str.replace("'", '"')

    try:
        return json.loads(js_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON 解析失败 {html_path}: {e}")


def extract_labels(html_path):
    """提取课文下拉选项标签"""
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    options = re.findall(r'<option[^>]*value="([^"]*)"[^>]*>(.*?)</option>', content)
    return {opt[0]: opt[1].strip() for opt in options}


def build_lesson(lesson_num, html_path):
    """从 HTML 构建一个 lesson 的数据"""
    alllesson = extract_alllesson(html_path)
    labels = extract_labels(html_path)

    texts = []
    s_counter = 0
    for lesson_key, sentences in alllesson.items():
        label = labels.get(lesson_key, '课文')
        text_id = f'lesson{lesson_num}-text{lesson_key.replace("lesson", "")}'
        content_sentences = []

        for sent in sentences:
            s_counter += 1
            content_sentences.append({
                'id': f'l{lesson_num}t{lesson_key.replace("lesson", "")}s{s_counter}',
                'cn': sent['cn'],
                'split': sent['split'],
                'en': sent['en'],
                'dict': sent['dict'],
            })

        texts.append({
            'id': text_id,
            'label': label,
            'sentences': content_sentences,
        })

    cn_nums = ['零','一','二','三','四','五','六','七','八','九','十',
               '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
               '二十一','二十二','二十三','二十四','二十五']

    return {
        'id': f'lesson{lesson_num}',
        'title': f'第{cn_nums[lesson_num]}课',
        'titleEn': f'Lesson {lesson_num}',
        'texts': texts,
    }


def esc(s):
    """转义双引号和反斜杠，用于 TypeScript 双引号字符串"""
    return s.replace('\\', '\\\\').replace('"', '\\"')


def gen_dict(d, indent=18):
    if not d:
        return '{}'
    lines = ['{']
    items = list(d.items())
    for i, (k, v) in enumerate(items):
        comma = ',' if i < len(items) - 1 else ''
        lines.append(f'{" " * (indent + 2)}"{esc(k)}": "{esc(v)}"{comma}')
    lines.append(f'{" " * indent}}}')
    return '\n'.join(lines)


def gen_sentence(s, indent=10):
    pad = ' ' * indent
    ip = ' ' * (indent + 2)
    return f'''{pad}{{
{ip}id: '{s["id"]}',
{ip}cn: "{esc(s['cn'])}",
{ip}split: "{esc(s['split'])}",
{ip}en: "{esc(s['en'])}",
{ip}dict: {gen_dict(s['dict'], indent + 14)},
{pad}}}'''


def gen_text(t, indent=8):
    pad = ' ' * indent
    ip = ' ' * (indent + 2)
    sents = ',\n'.join(gen_sentence(s, indent + 4) for s in t['sentences'])
    return f'''{pad}{{
{ip}id: '{t["id"]}',
{ip}label: "{esc(t['label'])}",
{ip}sentences: [
{sents}
{ip}],
{pad}}}'''


def gen_lesson(l, indent=6):
    pad = ' ' * indent
    ip = ' ' * (indent + 2)
    texts = ',\n'.join(gen_text(t, indent + 4) for t in l['texts'])
    return f'''{pad}{{
{ip}id: '{l["id"]}',
{ip}title: '{l["title"]}',
{ip}titleEn: '{l["titleEn"]}',
{ip}texts: [
{texts}
{ip}],
{pad}}}'''


def gen_textbook(tb, indent=4):
    pad = ' ' * indent
    ip = ' ' * (indent + 2)
    lessons = ',\n'.join(gen_lesson(l, indent + 4) for l in tb['lessons'])
    return f'''{pad}{{
{ip}id: '{tb["id"]}',
{ip}categoryId: '{tb["categoryId"]}',
{ip}title: "{esc(tb['title'])}",
{ip}titleEn: "{esc(tb['titleEn'])}",
{ip}level: '{tb["level"]}',
{ip}lessons: [
{lessons}
{ip}],
{pad}}}'''


# ============ 主流程 ============

# 定义教材文件映射
TEXTBOOK_FILES = {
    'hanyu-jiaocheng-1a': {
        'title': '《汉语教程》第一册（上）',
        'titleEn': 'Chinese Course Vol.1A',
        'categoryId': 'comprehensive',
        'level': '初级',
        'files': {
            3: '《汉语教程》第一册（上）第3课.html',
        }
    },
    'hanyu-jiaocheng-1b': {
        'title': '《汉语教程》第一册（下）',
        'titleEn': 'Chinese Course Vol.1B',
        'categoryId': 'comprehensive',
        'level': '初级',
        'files': {
            20: '《汉语教程》第一册(下)第20课.html',
            21: '《汉语教程》第一册(下)第21课.html',
            22: '《汉语教程》第一册(下)第22课.html',
        }
    },
}

textbooks = []

for tb_id, tb_info in TEXTBOOK_FILES.items():
    lessons = []
    for lesson_num, filename in sorted(tb_info['files'].items()):
        filepath = os.path.join(DATA_DIR, filename)
        if os.path.exists(filepath):
            try:
                lesson = build_lesson(lesson_num, filepath)
                total_s = sum(len(t['sentences']) for t in lesson['texts'])
                print(f'  [OK] {filename}: {len(lesson["texts"])} 篇课文, {total_s} 句')
                lessons.append(lesson)
            except Exception as e:
                print(f'  [FAIL] {filename}: {e}')
        else:
            print(f'  [SKIP] 文件不存在: {filepath}')

    textbooks.append({
        'id': tb_id,
        'categoryId': tb_info['categoryId'],
        'title': tb_info['title'],
        'titleEn': tb_info['titleEn'],
        'level': tb_info['level'],
        'lessons': lessons,
    })

# 生成完整 content.ts
categories_ts = """,  {
    slug: 'comprehensive',
    name: '综合汉语',
    nameEn: 'Comprehensive Chinese',
    description: '系统学习听、说、读、写，全面提高汉语水平',
    icon: '📚',
  },
  {
    slug: 'hsk',
    name: 'HSK 考试类',
    nameEn: 'HSK Exam Prep',
    description: '针对 HSK 各等级考试进行专项训练',
    icon: '📝',
  },
  {
    slug: 'oral',
    name: '口语类',
    nameEn: 'Oral Chinese',
    description: '聚焦日常对话与口语表达，开口说汉语',
    icon: '🗣️',
  },
  {
    slug: 'vocational',
    name: '中文+职业技能',
    nameEn: 'Chinese + Vocational Skills',
    description: '结合职业场景学习专业汉语',
    icon: '💼',
  }"""

textbooks_ts = ',\n'.join(gen_textbook(tb) for tb in textbooks)

output = f"""import type {{ Category, CategorySlug, Textbook }} from '@/types'

export const categories: Category[] = [{categories_ts}
]

export const textbooks: Textbook[] = [
{textbooks_ts}
]

export function getTextbookById(id: string): Textbook | undefined {{
  return textbooks.find((t) => t.id === id)
}}

export function getTextbooksByCategory(categoryId: CategorySlug): Textbook[] {{
  return textbooks.filter((t) => t.categoryId === categoryId)
}}
"""

output_path = os.path.join(APP_DIR, 'src', 'data', 'content.ts')
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(output)

print(f'\n[OK] 已写入 {output_path}')
for tb in textbooks:
    total_s = sum(len(s) for l in tb['lessons'] for t in l['texts'] for s in t['sentences'])
    print(f'  {tb["title"]}: {len(tb["lessons"])} 课, {total_s} 句')
