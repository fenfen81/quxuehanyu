#!/usr/bin/env python
# -*- coding: utf-8 -*-
# 从《汉语教程 第二册-上.docx》按正文顺序提取「第一课」到「第二课」之间的
# 段落与表格（课文句子、生词表），保留结构，输出到 stdout 供 AI 生成 book.json。
import sys
from docx import Document
from docx.text.paragraph import Paragraph
from docx.table import Table

PATH = r"C:/Users/Lenovo/Desktop/汉语教程 第二册-上.docx"
doc = Document(PATH)
body = doc.element.body

capturing = False
seen_lesson1 = 0
out = []

for child in body.iterchildren():
    tag = child.tag.split('}')[-1]
    if tag == 'p':
        p = Paragraph(child, doc)
        txt = p.text.strip()
        if '第一课' in txt:
            seen_lesson1 += 1
            if seen_lesson1 == 1:
                capturing = True
        if '第二课' in txt:
            # 遇到第二课标题，停止（已捕获第一课全部内容）
            capturing = False
            break
        if capturing and txt:
            out.append(('P', txt))
    elif tag == 'tbl':
        if capturing:
            t = Table(child, doc)
            rows = [[c.text.strip() for c in row.cells] for row in t.rows]
            # 去掉全空行
            rows = [r for r in rows if any(r)]
            if rows:
                out.append(('T', rows))

print(f"# 共捕获 {len(out)} 个块（段落/表格）\n")
for i, (kind, val) in enumerate(out):
    if kind == 'P':
        print(f"[P{i}] {val}")
    else:
        print(f"[T{i}] 表格 {len(val)} 行：")
        for r in val:
            print("    | " + " | ".join(r))
