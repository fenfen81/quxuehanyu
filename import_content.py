#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
句游汉语 - 课文内容批量导入工具

功能：
1. 从现有 HTML demo 文件中提取 allLesson 数据
2. 从简单 JSON 文件导入新课
3. 自动生成 TypeScript 代码并合并到 content.ts

用法：
  python import_content.py extract-html <html文件路径> [--textbook-id xxx] [--category comprehensive]
  python import_content.py import-json <json文件路径>
  python import_content.py batch-html <目录路径> [--textbook-id xxx]
  python import_content.py create-template [输出文件路径]
"""

import json
import re
import sys
import os
from pathlib import Path
from typing import Any

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


def extract_alllesson_from_html(html_path: str) -> dict:
    """从 HTML demo 文件中提取 allLesson JavaScript 对象"""
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 查找 allLesson = { ... };
    match = re.search(r'const\s+allLesson\s*=\s*(\{.*?\});', content, re.DOTALL)
    if not match:
        match = re.search(r'var\s+allLesson\s*=\s*(\{.*?\});', content, re.DOTALL)
    if not match:
        match = re.search(r'let\s+allLesson\s*=\s*(\{.*?\});', content, re.DOTALL)

    # 也查找 questionList = [ ... ] 格式（单课文无分课）
    if not match:
        match = re.search(r'(?:const|var|let)\s+questionList\s*=\s*(\[.*?\]);', content, re.DOTALL)

    if not match:
        raise ValueError(f"在 {html_path} 中找不到 allLesson 或 questionList 数据")

    js_obj_str = match.group(1)

    # 判断是否是 questionList 格式（数组，不是对象）
    is_question_list = js_obj_str.strip().startswith('[')

    # 将 JS 对象/数组转为合法 JSON
    if is_question_list:
        # questionList 是数组格式，直接包装成 lesson1
        js_obj_str = '{"lesson1":' + js_obj_str + '}'

    # 处理 JS 的 key 不带引号: lesson1: -> "lesson1":
    js_obj_str = re.sub(r'(\w+)\s*:', r'"\1":', js_obj_str)
    # 修复已经被双引号包围的 key (避免重复引号)
    js_obj_str = re.sub(r'""(\w+)"":', r'"\1":', js_obj_str)
    # 移除 JS 行尾逗号 (trailing commas)
    js_obj_str = re.sub(r',\s*([}\]])', r'\1', js_obj_str)

    try:
        data = json.loads(js_obj_str)
    except json.JSONDecodeError as e:
        # 更宽松的解析：逐步清理
        # 移除单引号替换为双引号
        js_obj_str = js_obj_str.replace("'", '"')
        try:
            data = json.loads(js_obj_str)
        except json.JSONDecodeError:
            raise ValueError(f"无法解析 {html_path} 中的 allLesson 数据: {e}")

    return data


def extract_lesson_info_from_html(html_path: str) -> dict:
    """从 HTML 文件中提取课程元信息（标题、课文列表等）"""
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    info = {}

    # 提取课程标题
    title_match = re.search(r'class="course-title"[^>]*>(.*?)</div>', content)
    if title_match:
        info['courseTitle'] = title_match.group(1).strip()

    # 提取课文选项
    options = re.findall(r'<option[^>]*value="([^"]*)"[^>]*>(.*?)</option>', content)
    if options:
        info['texts'] = [(opt[0], opt[1].strip()) for opt in options]

    return info


def html_lesson_to_content_format(
    alllesson_data: dict,
    lesson_info: dict,
    textbook_id: str = None,
    category_id: str = 'comprehensive',
    lesson_number: int = None,
) -> dict:
    """将 HTML demo 的 allLesson 数据转为 content.ts 的格式"""

    texts = []
    sentence_counter = 0

    for lesson_key, sentences in alllesson_data.items():
        # 从 lesson_info 获取课文标题
        text_label = ''
        if lesson_info.get('texts'):
            for opt_val, opt_label in lesson_info['texts']:
                if opt_val == lesson_key:
                    text_label = opt_label
                    break
        if not text_label:
            text_label = f'课文'

        text_id = f'lesson{lesson_number}-text{lesson_key.replace("lesson", "")}'
        content_sentences = []

        for sent in sentences:
            sentence_counter += 1
            content_sentences.append({
                'id': f'l{lesson_number}t{lesson_key.replace("lesson", "")}s{sentence_counter}',
                'cn': sent['cn'],
                'split': sent['split'],
                'en': sent['en'],
                'dict': sent['dict'],
            })

        texts.append({
            'id': text_id,
            'label': text_label,
            'sentences': content_sentences,
        })

    lesson_id = f'lesson{lesson_number}' if lesson_number else 'lesson1'

    return {
        'id': lesson_id,
        'title': f'第{chinese_number(lesson_number)}课' if lesson_number else '第一课',
        'titleEn': f'Lesson {lesson_number}' if lesson_number else 'Lesson 1',
        'texts': texts,
    }


def chinese_number(n: int) -> str:
    """将数字转为中文数字"""
    cn_nums = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
               '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
               '二十一', '二十二', '二十三', '二十四', '二十五', '二十六', '二十七', '二十八', '二十九', '三十',
               '三十一', '三十二', '三十三', '三十四', '三十五', '三十六', '三十七', '三十八', '三十九', '四十',
               '四十一', '四十二', '四十三', '四十四', '四十五', '四十六', '四十七', '四十八', '四十九', '五十']
    if 0 <= n < len(cn_nums):
        return cn_nums[n]
    return str(n)


def generate_dict_ts(dict_obj: dict, indent: int = 18) -> str:
    """生成 dict 字段的 TypeScript 代码"""
    if not dict_obj:
        return '{}'

    lines = ['{']
    items = list(dict_obj.items())
    for i, (key, val) in enumerate(items):
        comma = ',' if i < len(items) - 1 else ''
        # Use double quotes for values to avoid single-quote escaping issues
        # Escape double quotes and backslashes inside values
        val_escaped = val.replace('\\', '\\\\').replace('"', '\\"')
        key_escaped = key.replace('\\', '\\\\').replace('"', '\\"')
        lines.append(f"{' ' * (indent + 2)}\"{key_escaped}\": \"{val_escaped}\"{comma}")
    lines.append(f"{' ' * indent}}}")
    return '\n'.join(lines)


def generate_sentence_ts(sent: dict, indent: int = 10) -> str:
    """生成单个句子的 TypeScript 代码"""
    pad = ' ' * indent
    inner_pad = ' ' * (indent + 2)

    # Use double quotes to avoid single-quote escaping issues
    cn_esc = sent['cn'].replace('\\', '\\\\').replace('"', '\\"')
    split_esc = sent['split'].replace('\\', '\\\\').replace('"', '\\"')
    en_esc = sent['en'].replace('\\', '\\\\').replace('"', '\\"')

    dict_ts = generate_dict_ts(sent['dict'], indent + 14)

    return f"""{pad}{{
{inner_pad}id: '{sent['id']}',
{inner_pad}cn: \"{cn_esc}\",
{inner_pad}split: \"{split_esc}\",
{inner_pad}en: \"{en_esc}\",
{inner_pad}dict: {dict_ts},
{pad}}}"""


def generate_text_ts(text: dict, indent: int = 8) -> str:
    """生成单个课文的 TypeScript 代码"""
    pad = ' ' * indent
    inner_pad = ' ' * (indent + 2)

    sentences_ts = ',\n'.join(generate_sentence_ts(s, indent + 4) for s in text['sentences'])

    label_esc = text['label'].replace('\\', '\\\\').replace('"', '\\"')

    return f"""{pad}{{
{inner_pad}id: '{text['id']}',
{inner_pad}label: '{label_esc}',
{inner_pad}sentences: [
{sentences_ts}
{inner_pad}],
{pad}}}"""


def generate_lesson_ts(lesson: dict, indent: int = 6) -> str:
    """生成单个课程的 TypeScript 代码"""
    pad = ' ' * indent
    inner_pad = ' ' * (indent + 2)

    texts_ts = ',\n'.join(generate_text_ts(t, indent + 4) for t in lesson['texts'])

    return f"""{pad}{{
{inner_pad}id: '{lesson['id']}',
{inner_pad}title: '{lesson['title']}',
{inner_pad}titleEn: '{lesson['titleEn']}',
{inner_pad}texts: [
{texts_ts}
{inner_pad}],
{pad}}}"""


def generate_textbook_ts(textbook: dict, indent: int = 4) -> str:
    """生成教材的 TypeScript 代码"""
    pad = ' ' * indent
    inner_pad = ' ' * (indent + 2)

    lessons_ts = ',\n'.join(generate_lesson_ts(l, indent + 4) for l in textbook['lessons'])

    title_esc = textbook['title'].replace('\\', '\\\\').replace('"', '\\"')
    title_en_esc = textbook.get('titleEn', '').replace('\\', '\\\\').replace('"', '\\"')
    level_esc = textbook.get('level', '').replace('\\', '\\\\').replace('"', '\\"')

    return f"""{pad}{{
{inner_pad}id: '{textbook['id']}',
{inner_pad}categoryId: '{textbook['categoryId']}',
{inner_pad}title: '{title_esc}',
{inner_pad}titleEn: '{title_en_esc}',
{inner_pad}level: '{level_esc}',
{inner_pad}lessons: [
{lessons_ts}
{inner_pad}],
{pad}}}"""


def generate_full_content_ts(categories: list, textbooks: list) -> str:
    """生成完整的 content.ts 文件"""
    # 生成 categories
    cat_lines = []
    for cat in categories:
        cat_lines.append(f"""  {{
    slug: '{cat['slug']}',
    name: '{cat['name']}',
    nameEn: '{cat['nameEn']}',
    description: '{cat['description']}',
    icon: '{cat['icon']}',
  }}""")

    categories_ts = ',\n'.join(cat_lines)

    # 生成 textbooks
    textbooks_ts = ',\n'.join(generate_textbook_ts(tb) for tb in textbooks)

    # 生成 getTextbookById 和 getTextbooksByCategory 的 slug 类型
    slug_values = ' | '.join(f"'{cat['slug']}'" for cat in categories)

    return f"""import type {{ Category, CategorySlug, Textbook }} from '@/types'

export const categories: Category[] = [
{categories_ts},
]

export const textbooks: Textbook[] = [
{textbooks_ts},
]

export function getTextbookById(id: string): Textbook | undefined {{
  return textbooks.find((t) => t.id === id)
}}

export function getTextbooksByCategory(categoryId: CategorySlug): Textbook[] {{
  return textbooks.filter((t) => t.categoryId === categoryId)
}}
"""


def load_existing_content(content_path: str) -> tuple:
    """从现有 content.ts 中加载已有数据"""
    with open(content_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 提取 categories 数据 - 通过执行 TS 不可行，直接解析
    # 这里我们简单返回原始内容，让合并脚本处理
    return content


def merge_textbooks(existing_textbooks: list, new_textbook: dict) -> list:
    """合并新课到已有教材列表"""
    # 查找是否已有该教材
    for i, tb in enumerate(existing_textbooks):
        if tb['id'] == new_textbook['id']:
            # 合并课程
            existing_lesson_ids = {l['id'] for l in tb['lessons']}
            for lesson in new_textbook['lessons']:
                if lesson['id'] not in existing_lesson_ids:
                    tb['lessons'].append(lesson)
                else:
                    # 更新已有课程
                    for j, existing_lesson in enumerate(tb['lessons']):
                        if existing_lesson['id'] == lesson['id']:
                            tb['lessons'][j] = lesson
            return existing_textbooks

    # 新教材，直接追加
    existing_textbooks.append(new_textbook)
    return existing_textbooks


# ============ 主流程 ============

def cmd_extract_html(args: list):
    """从 HTML 文件提取数据并输出 JSON"""
    if not args:
        print("用法: python import_content.py extract-html <html文件路径> [--lesson-number N] [--textbook-id xxx]")
        sys.exit(1)

    html_path = args[0]
    lesson_number = None
    textbook_id = None

    i = 1
    while i < len(args):
        if args[i] == '--lesson-number' and i + 1 < len(args):
            lesson_number = int(args[i + 1])
            i += 2
        elif args[i] == '--textbook-id' and i + 1 < len(args):
            textbook_id = args[i + 1]
            i += 2
        else:
            i += 1

    alllesson_data = extract_alllesson_from_html(html_path)
    lesson_info = extract_lesson_info_from_html(html_path)

    if not lesson_number:
        # 从文件名提取课号
        num_match = re.search(r'第(\d+)课', html_path)
        if num_match:
            lesson_number = int(num_match.group(1))
        else:
            lesson_number = 1

    lesson_data = html_lesson_to_content_format(
        alllesson_data, lesson_info,
        lesson_number=lesson_number,
    )

    # 输出 JSON
    output = {
        'lesson': lesson_data,
        'source': html_path,
        'lessonNumber': lesson_number,
    }

    if textbook_id:
        output['textbookId'] = textbook_id

    print(json.dumps(output, ensure_ascii=False, indent=2))


def cmd_import_json(args: list):
    """从 JSON 文件导入"""
    if not args:
        print("用法: python import_content.py import-json <json文件路径> [--output content.ts路径]")
        sys.exit(1)

    json_path = args[0]
    output_path = None

    i = 1
    while i < len(args):
        if args[i] == '--output' and i + 1 < len(args):
            output_path = args[i + 1]
            i += 2
        else:
            i += 1

    with open(json_path, 'r', encoding='utf-8') as f:
        import_data = json.load(f)

    # 验证数据格式
    required_keys = ['textbookId', 'categoryId', 'lessons']
    for key in required_keys:
        if key not in import_data:
            raise ValueError(f"JSON 缺少必需字段: {key}")

    textbook = {
        'id': import_data['textbookId'],
        'categoryId': import_data['categoryId'],
        'title': import_data.get('textbookTitle', import_data['textbookId']),
        'titleEn': import_data.get('textbookTitleEn', ''),
        'level': import_data.get('level', '初级'),
        'lessons': import_data['lessons'],
    }

    # 读取现有 content.ts
    if not output_path:
        script_dir = Path(__file__).parent
        output_path = str(script_dir / 'src' / 'data' / 'content.ts')

    # 生成并输出
    categories = [
        {'slug': 'comprehensive', 'name': '综合汉语', 'nameEn': 'Comprehensive Chinese',
         'description': '系统学习听、说、读、写，全面提高汉语水平', 'icon': '📚'},
        {'slug': 'hsk', 'name': 'HSK 考试类', 'nameEn': 'HSK Exam Prep',
         'description': '针对 HSK 各等级考试进行专项训练', 'icon': '📝'},
        {'slug': 'oral', 'name': '口语类', 'nameEn': 'Oral Chinese',
         'description': '聚焦日常对话与口语表达，开口说汉语', 'icon': '🗣️'},
        {'slug': 'vocational', 'name': '中文+职业技能', 'nameEn': 'Chinese + Vocational Skills',
         'description': '结合职业场景学习专业汉语', 'icon': '💼'},
    ]

    # 如果有现有数据，需要合并
    existing_textbooks = load_existing_textbooks(output_path)
    textbooks = merge_textbooks(existing_textbooks, textbook)

    ts_content = generate_full_content_ts(categories, textbooks)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ts_content)

    print(f"[OK] 已导入到 {output_path}")
    print(f"   教材: {textbook['title']}")
    print(f"   课程数: {len(textbook['lessons'])}")
    total_sentences = sum(
        len(s) for l in textbook['lessons'] for t in l['texts'] for s in t['sentences']
    )
    print(f"   总句数: {total_sentences}")


def load_existing_textbooks(content_path: str) -> list:
    """从现有 content.ts 解析教材数据"""
    if not os.path.exists(content_path):
        return []

    with open(content_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 简化解析：提取 textbooks 数组中的数据
    # 由于 TS 不是合法 JSON，我们用正则提取关键结构
    textbooks = []

    # 查找每个 textbook 块
    # 这里我们用更可靠的方式 - 找到 id: 'xxx', categoryId: 'xxx' 模式
    tb_pattern = re.compile(
        r"id:\s*'([^']+)',\s*categoryId:\s*'([^']+)',\s*title:\s*'([^']*)',\s*titleEn:\s*'([^']*)',\s*level:\s*'([^']*)'"
    )

    # 查找所有教材的起始位置
    tb_blocks = list(tb_pattern.finditer(content))

    for idx, match in enumerate(tb_blocks):
        tb_id = match.group(1)
        cat_id = match.group(2)
        title = match.group(3)
        title_en = match.group(4)
        level = match.group(5)

        # 提取这个教材的 lessons 部分
        # 找到 lessons: [ ... ] 块
        start_pos = match.start()
        # 找到下一个教材的开始位置或文件结尾
        end_pos = tb_blocks[idx + 1].start() if idx + 1 < len(tb_blocks) else len(content)
        tb_content = content[start_pos:end_pos]

        # 提取 lessons
        lessons = parse_lessons_from_ts(tb_content)

        textbooks.append({
            'id': tb_id,
            'categoryId': cat_id,
            'title': title,
            'titleEn': title_en,
            'level': level,
            'lessons': lessons,
        })

    return textbooks


def parse_lessons_from_ts(ts_content: str) -> list:
    """从 TypeScript 代码中解析 lessons 数据"""
    lessons = []

    # 查找每个 lesson 块
    lesson_pattern = re.compile(
        r"id:\s*'([^']+)',\s*title:\s*'([^']*)',\s*titleEn:\s*'([^']*)'"
    )

    lesson_matches = list(lesson_pattern.finditer(ts_content))

    for idx, match in enumerate(lesson_matches):
        lesson_id = match.group(1)
        title = match.group(2)
        title_en = match.group(3)

        start_pos = match.start()
        end_pos = lesson_matches[idx + 1].start() if idx + 1 < len(lesson_matches) else len(ts_content)
        lesson_content = ts_content[start_pos:end_pos]

        texts = parse_texts_from_ts(lesson_content)

        lessons.append({
            'id': lesson_id,
            'title': title,
            'titleEn': title_en,
            'texts': texts,
        })

    return lessons


def parse_texts_from_ts(ts_content: str) -> list:
    """从 TypeScript 代码中解析 texts 数据"""
    texts = []

    text_pattern = re.compile(
        r"id:\s*'([^']+)',\s*label:\s*'([^']*)'"
    )

    text_matches = list(text_pattern.finditer(ts_content))

    for idx, match in enumerate(text_matches):
        text_id = match.group(1)
        label = match.group(2)

        start_pos = match.start()
        end_pos = text_matches[idx + 1].start() if idx + 1 < len(text_matches) else len(ts_content)
        text_content = ts_content[start_pos:end_pos]

        sentences = parse_sentences_from_ts(text_content)

        texts.append({
            'id': text_id,
            'label': label,
            'sentences': sentences,
        })

    return texts


def parse_sentences_from_ts(ts_content: str) -> list:
    """从 TypeScript 代码中解析 sentences 数据"""
    sentences = []

    # 匹配句子: id/cn/split/en/dict
    sent_pattern = re.compile(
        r"id:\s*'([^']+)',\s*cn:\s*'([^']*)',\s*split:\s*'([^']*)',\s*en:\s*'([^']*)',\s*dict:\s*\{([^}]*)\}"
    )

    for match in sent_pattern.finditer(ts_content):
        sent_id = match.group(1)
        cn = match.group(2)
        split = match.group(3)
        en = match.group(4)
        dict_str = match.group(5)

        # 解析 dict
        dict_obj = {}
        dict_pattern = re.compile(r"'([^']+)':\s*'([^']*)'")
        for dm in dict_pattern.finditer(dict_str):
            dict_obj[dm.group(1).replace("\\'", "'")] = dm.group(2).replace("\\'", "'")

        sentences.append({
            'id': sent_id,
            'cn': cn.replace("\\'", "'"),
            'split': split.replace("\\'", "'"),
            'en': en.replace("\\'", "'"),
            'dict': dict_obj,
        })

    return sentences


def cmd_batch_import_html(args: list):
    """批量导入多个 HTML demo 文件"""
    if not args:
        print("用法: python import_content.py batch-html <目录路径> [--textbook-id xxx] [--textbook-title 'xxx'] [--output content.ts路径]")
        sys.exit(1)

    dir_path = args[0]
    textbook_id = 'hanyu-jiaocheng-1b'
    textbook_title = '《汉语教程》第一册（下）'
    textbook_title_en = 'Chinese Course Vol.1B'
    category_id = 'comprehensive'
    level = '初级'
    output_path = None

    i = 1
    while i < len(args):
        if args[i] == '--textbook-id' and i + 1 < len(args):
            textbook_id = args[i + 1]
            i += 2
        elif args[i] == '--textbook-title' and i + 1 < len(args):
            textbook_title = args[i + 1]
            i += 2
        elif args[i] == '--textbook-title-en' and i + 1 < len(args):
            textbook_title_en = args[i + 1]
            i += 2
        elif args[i] == '--category' and i + 1 < len(args):
            category_id = args[i + 1]
            i += 2
        elif args[i] == '--level' and i + 1 < len(args):
            level = args[i + 1]
            i += 2
        elif args[i] == '--output' and i + 1 < len(args):
            output_path = args[i + 1]
            i += 2
        else:
            i += 1

    if not output_path:
        script_dir = Path(__file__).parent
        output_path = str(script_dir / 'src' / 'data' / 'content.ts')

    # 查找目录中的 HTML 文件
    html_files = sorted(Path(dir_path).glob('*.html'))

    if not html_files:
        print(f"[FAIL] 在 {dir_path} 中没有找到 HTML 文件")
        sys.exit(1)

    print(f"找到 {len(html_files)} 个 HTML 文件:")
    for f in html_files:
        print(f"  - {f.name}")

    all_lessons = []

    for html_file in html_files:
        try:
            alllesson_data = extract_alllesson_from_html(str(html_file))
            lesson_info = extract_lesson_info_from_html(str(html_file))

            # 提取课号
            num_match = re.search(r'第(\d+)课', str(html_file))
            lesson_number = int(num_match.group(1)) if num_match else len(all_lessons) + 1

            lesson_data = html_lesson_to_content_format(
                alllesson_data, lesson_info,
                lesson_number=lesson_number,
            )

            all_lessons.append(lesson_data)
            total_s = sum(len(t['sentences']) for t in lesson_data['texts'])
            print(f"  [OK] {html_file.name}: {len(lesson_data['texts'])} 篇课文, {total_s} 个句子")

        except Exception as e:
            print(f"  [FAIL] {html_file.name}: 提取失败 - {e}")

    if not all_lessons:
        print("[FAIL] 没有成功提取任何数据")
        sys.exit(1)

    # 按 lesson_number 排序
    all_lessons.sort(key=lambda x: int(re.search(r'\d+', x['id']).group()) if re.search(r'\d+', x['id']) else 0)

    # 重新编号句子 ID 避免冲突
    for lesson in all_lessons:
        lesson_num = re.search(r'\d+', lesson['id']).group()
        for t_idx, text in enumerate(lesson['texts'], 1):
            for s_idx, sent in enumerate(text['sentences'], 1):
                sent['id'] = f'l{lesson_num}t{t_idx}s{s_idx}'

    new_textbook = {
        'id': textbook_id,
        'categoryId': category_id,
        'title': textbook_title,
        'titleEn': textbook_title_en,
        'level': level,
        'lessons': all_lessons,
    }

    # 合并到已有数据
    existing_textbooks = load_existing_textbooks(output_path)
    textbooks = merge_textbooks(existing_textbooks, new_textbook)

    categories = [
        {'slug': 'comprehensive', 'name': '综合汉语', 'nameEn': 'Comprehensive Chinese',
         'description': '系统学习听、说、读、写，全面提高汉语水平', 'icon': '📚'},
        {'slug': 'hsk', 'name': 'HSK 考试类', 'nameEn': 'HSK Exam Prep',
         'description': '针对 HSK 各等级考试进行专项训练', 'icon': '📝'},
        {'slug': 'oral', 'name': '口语类', 'nameEn': 'Oral Chinese',
         'description': '聚焦日常对话与口语表达，开口说汉语', 'icon': '🗣️'},
        {'slug': 'vocational', 'name': '中文+职业技能', 'nameEn': 'Chinese + Vocational Skills',
         'description': '结合职业场景学习专业汉语', 'icon': '💼'},
    ]

    ts_content = generate_full_content_ts(categories, textbooks)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ts_content)

    total_sentences = sum(
        len(s) for l in new_textbook['lessons'] for t in l['texts'] for s in t['sentences']
    )
    print(f"\n[OK] 批量导入完成！写入到 {output_path}")
    print(f"   教材: {textbook_title}")
    print(f"   课程数: {len(all_lessons)}")
    print(f"   总句数: {total_sentences}")


def cmd_create_template(args: list):
    """创建一个 JSON 导入模板"""
    template = {
        "textbookId": "hanyu-jiaocheng-1b",
        "textbookTitle": "《汉语教程》第一册（下）",
        "textbookTitleEn": "Chinese Course Vol.1B",
        "categoryId": "comprehensive",
        "level": "初级",
        "lessons": [
            {
                "lessonId": "lesson23",
                "lessonTitle": "第二十三课",
                "lessonTitleEn": "Lesson 23",
                "texts": [
                    {
                        "textId": "lesson23-text1",
                        "label": "课文一：示例标题",
                        "sentences": [
                            {
                                "cn": "我是留学生。",
                                "split": "我 是 留学生",
                                "en": "I am an international student.",
                                "dict": {
                                    "我": "wǒ / I",
                                    "是": "shì / am/is/are",
                                    "留学生": "liú xué shēng / international student"
                                }
                            }
                        ]
                    }
                ]
            }
        ]
    }

    output_path = args[0] if args else 'import_template.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(template, f, ensure_ascii=False, indent=2)

    print(f"[OK] 模板已创建: {output_path}")


def cmd_download_strokes(args: list):
    """下载缺失的汉字笔顺数据（从 npm 包复制）"""
    script_dir = Path(__file__).parent

    hanzi_data_dir = script_dir / 'public' / 'hanzi-data'
    npm_data_dir = script_dir / 'node_modules' / 'hanzi-writer-data'
    content_file = script_dir / 'src' / 'data' / 'content.ts'

    if not content_file.exists():
        print(f'[FAIL] content.ts 不存在: {content_file}')
        sys.exit(1)

    with open(content_file, 'r', encoding='utf-8') as f:
        content = f.read()

    char_set = set()
    for c in content:
        if '\u4e00' <= c <= '\u9fff':
            char_set.add(c)

    hanzi_data_dir.mkdir(parents=True, exist_ok=True)
    existing = set()
    for f in hanzi_data_dir.iterdir():
        if f.suffix == '.json':
            existing.add(f.stem)

    missing = sorted(char_set - existing)
    print(f'总汉字数: {len(char_set)}')
    print(f'已有笔顺: {len(existing)}')
    print(f'缺失: {len(missing)}')

    if not missing:
        print('[OK] 所有汉字笔顺数据已齐全')
        return

    copied = 0
    not_found = []
    if npm_data_dir.exists():
        import shutil
        for c in missing:
            src = npm_data_dir / f'{c}.json'
            dst = hanzi_data_dir / f'{c}.json'
            if src.exists():
                shutil.copy2(str(src), str(dst))
                copied += 1
            else:
                not_found.append(c)
        print(f'[OK] 从 npm 包复制: {copied}')
    else:
        print('[WARN] hanzi-writer-data npm 包未安装')
        print('       请运行: npm install hanzi-writer-data --no-save')
        print('       然后重新执行此命令')
        not_found = missing

    if not_found:
        print(f'[WARN] 以下 {len(not_found)} 个字无笔顺数据: {"".join(not_found)}')
        print('       WordPopup 会显示"笔顺数据不可用"提示')

    total = len(list(hanzi_data_dir.iterdir()))
    print(f'总计笔顺文件: {total}')
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    command = sys.argv[1]
    cmd_args = sys.argv[2:]

    if command == 'extract-html':
        cmd_extract_html(cmd_args)
    elif command == 'import-json':
        cmd_import_json(cmd_args)
    elif command == 'batch-html':
        cmd_batch_import_html(cmd_args)
    elif command == 'create-template':
        cmd_create_template(cmd_args)
    elif command == 'download-strokes':
        cmd_download_strokes(cmd_args)
    else:
        print(f"未知命令: {command}")
        print(__doc__)
        sys.exit(1)
