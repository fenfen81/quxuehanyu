#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 通用教材抽取器（标准库实现，无需 python-docx / 联网）
# 用法: python _extract_lesson.py <docx> <第X课数字> [终点课数字]
#   - 自动避开目录(TOC)：真实课标题后、遇到「下一不同编号课标题」前必须出现生词表格/列表
#   - 清洗汉字间空格（docx 常把每字拆成独立 run 带空格）
#   - 输出该课「课文对话句」与「生词条目」
import sys, zipfile, re
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
CJK = re.compile(r'[\u4e00-\u9fff]')

def load(path):
    z = zipfile.ZipFile(path)
    root = ET.fromstring(z.read('word/document.xml'))
    body = root.find(W+'body')
    blocks = []
    def walk(el):
        tag = el.tag.split('}')[-1]
        if tag == 'p':
            txt = ''.join(t.text or '' for t in el.iter(W+'t'))
            blocks.append(('P', txt.strip()))
        elif tag == 'tbl':
            rows = []
            for tr in el.findall(W+'tr'):
                cells = [''.join(c.itertext()).replace('\n',' ').strip() for c in tr.findall(W+'tc')]
                if any(cells):
                    rows.append(cells)
            if rows:
                blocks.append(('T', rows))
        else:
            for c in list(el):
                walk(c)
    walk(body)
    return blocks

def clean_cjk(s):
    # 去掉汉字/中文标点之间的空格，保留英文单词间空格
    out = []
    for ch in s:
        if ch == ' ' and out and CJK.match(ch) is None and CJK.match(out[-1]) is None:
            # 保留：前后都是非汉字
            pass
        out.append(ch)
    # 更简单稳妥：删除出现在两个 CJK/中文标点 之间的空格
    res = []
    chars = list(s)
    for i, ch in enumerate(chars):
        if ch == ' ' and i > 0 and i+1 < len(chars):
            prev, nxt = chars[i-1], chars[i+1]
            if CJK.match(prev) or re.match(r'[，。？！：、（）“”‘’]', prev):
                if CJK.match(nxt) or re.match(r'[，。？！：、（）“”‘’]', nxt):
                    continue
        res.append(ch)
    return ''.join(res).strip()

def is_lesson_head(txt):
    return re.match(r'^第[一二三四五六七八九十\d]+课', txt) is not None

def cn_to_int(s):
    cn = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9}
    if s.isdigit(): return int(s)
    if s in cn: return cn[s]
    if '十' in s:
        p = s.split('十'); l = p[0]; r = p[1] if len(p)>1 else ''
        return (cn.get(l,1) if l else 1)*10 + (cn.get(r,0) if r else 0)
    return None

def lesson_num(txt):
    m = re.match(r'^第([一二三四五六七八九十\d]+)课', txt)
    if not m: return None
    return cn_to_int(m.group(1))

def real_heading_idx(target_num, blocks, heads):
    cand = [i for (i, t) in heads if lesson_num(t) == target_num]
    for i in cand:
        seen_table = False
        j = i + 1
        while j < len(blocks):
            b = blocks[j]
            if b[0] == 'T':
                seen_table = True
            nxt = lesson_num(b[1]) if b[0] == 'P' else None
            if nxt is not None and nxt != target_num:
                break
            j += 1
        if seen_table:
            return i
    return cand[0] if cand else None

def main():
    docx = sys.argv[1]
    target = int(sys.argv[2])
    end_lesson = int(sys.argv[3]) if len(sys.argv) > 3 else None
    blocks = load(docx)
    heads = [(i, b[1]) for i, b in enumerate(blocks) if b[0]=='P' and is_lesson_head(b[1])]

    real_start = real_heading_idx(target, blocks, heads)
    if real_start is None:
        print("# 未找到第 %d 课真实标题" % target, file=sys.stderr); sys.exit(1)
    real_end = len(blocks)
    if end_lesson:
        e = real_heading_idx(end_lesson, blocks, heads)
        if e is not None:
            real_end = e

    seg = blocks[real_start:real_end]
    print(f"# 第{target}课 真实区间 block {real_start} → {real_end}")
    print("\n===== 课文对话句（含 ： 或 句末标点的中文段落）=====")
    for k, v in seg:
        if k != 'P': continue
        c = clean_cjk(v)
        if not c: continue
        if CJK.search(c) and ('：' in c or '?' in c or '？' in c or '。' in c or '！' in c):
            # 跳过章节标签
            if re.match(r'^[（(]?[一二三四五六七八九十]?[)）]?\s*[一-龥]{1,6}$', c): continue
            print("[S] " + c)
    print("\n===== 生词条目（编号 N. 词）=====")
    for k, v in seg:
        if k != 'P': continue
        m = re.match(r'^(\d+)\.\s*([一-龥（）·]+)', v)
        if m:
            print(f"[W] {m.group(1)}. {clean_cjk(m.group(2))}")

if __name__ == '__main__':
    main()
