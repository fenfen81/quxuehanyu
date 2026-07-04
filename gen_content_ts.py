#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 content_data.json 生成 content.ts"""
import json
import sys
import os

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

APP_DIR = r'C:\ProgramData\WorkBuddy\chromium-env\1365jvd\WorkBuddy\2026-06-16-11-47-45\app'

with open(os.path.join(APP_DIR, 'src', 'data', 'content_data.json'), 'r', encoding='utf-8') as f:
    textbooks = json.load(f)


def esc(s):
    """转义双引号和反斜杠"""
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


def gen_sent(s, ind=10):
    pad = ' ' * ind
    ip = ' ' * (ind + 2)
    return f'''{pad}{{
{ip}id: '{s["id"]}',
{ip}cn: "{esc(s['cn'])}",
{ip}split: "{esc(s['split'])}",
{ip}en: "{esc(s['en'])}",
{ip}dict: {gen_dict(s['dict'], ind + 14)},
{pad}}}'''


def gen_text(t, ind=8):
    pad = ' ' * ind
    ip = ' ' * (ind + 2)
    sents = ',\n'.join(gen_sent(s, ind + 4) for s in t['sentences'])
    return f'''{pad}{{
{ip}id: '{t["id"]}',
{ip}label: "{esc(t['label'])}",
{ip}sentences: [
{sents}
{ip}],
{pad}}}'''


def gen_lesson(l, ind=6):
    pad = ' ' * ind
    ip = ' ' * (ind + 2)
    texts = ',\n'.join(gen_text(t, ind + 4) for t in l['texts'])
    return f'''{pad}{{
{ip}id: '{l["id"]}',
{ip}title: '{l["title"]}',
{ip}titleEn: '{l["titleEn"]}',
{ip}texts: [
{texts}
{ip}],
{pad}}}'''


def gen_textbook(tb, ind=4):
    pad = ' ' * ind
    ip = ' ' * (ind + 2)
    lessons = ',\n'.join(gen_lesson(l, ind + 4) for l in tb['lessons'])
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


categories_ts = """  {
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

export const categories: Category[] = [
{categories_ts}
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

# Verify
total_s = sum(len(s) for tb in textbooks for l in tb['lessons'] for t in l['texts'] for s in t['sentences'])
print(f'[OK] content.ts 已重写')
print(f'  教材数: {len(textbooks)}')
print(f'  总句数: {total_s}')
for tb in textbooks:
    ts = sum(len(s) for l in tb['lessons'] for t in l['texts'] for s in t['sentences'])
    print(f'  {tb["title"]}: {len(tb["lessons"])} 课, {ts} 句')
