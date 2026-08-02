#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
教材导入流水线 · 第 1 步：扫描版 PDF -> 单页图片

把扫描版教材 PDF 的每一页抽成一张 JPG，供后续读图识别使用。
优先直接抽取页面内嵌的原始图片（扫描件通常一页一张整页图），
抽不到时回退为整页渲染。

用法:
  python 01_extract_pages.py <pdf路径> <bookId> [--from N] [--to M] [--width W]

示例:
  python 01_extract_pages.py "C:/Users/Lenovo/Desktop/汉语教程 第二册-上.pdf" hanyu-jiaocheng-2a
  python 01_extract_pages.py "..." hanyu-jiaocheng-2a --from 1 --to 12   # 只抽目录页

输出:
  pipeline/books/<bookId>/pages/p001.jpg ...
  pipeline/books/<bookId>/pages/manifest.json
"""
import sys
import os
import json
import argparse

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(APP, 'pylibs'))

import warnings
import logging
warnings.filterwarnings('ignore')
logging.disable(logging.CRITICAL)

import pypdf
from PIL import Image


def extract(pdf_path, book_id, page_from=1, page_to=None, max_width=1400, quality=82):
    out_dir = os.path.join(HERE, 'books', book_id, 'pages')
    os.makedirs(out_dir, exist_ok=True)

    reader = pypdf.PdfReader(pdf_path)
    total = len(reader.pages)
    end = min(page_to or total, total)
    start = max(1, page_from)

    print(f'PDF   : {pdf_path}')
    print(f'总页数: {total}   本次抽取: {start}-{end}')
    print(f'输出至: {out_dir}')
    print('-' * 60)

    records = []
    for idx in range(start - 1, end):
        page_no = idx + 1
        name = f'p{page_no:03d}.jpg'
        dest = os.path.join(out_dir, name)

        if os.path.exists(dest):
            records.append({'page': page_no, 'file': name, 'skipped': True})
            continue

        img = None
        try:
            imgs = list(reader.pages[idx].images)
            if imgs:
                # 扫描件一页通常只有一张整页图；若有多张取面积最大的
                biggest = max(imgs, key=lambda im: im.image.size[0] * im.image.size[1])
                img = biggest.image
        except Exception as e:
            print(f'  p{page_no}: 内嵌图抽取失败({e})')

        if img is None:
            print(f'  p{page_no}: 无内嵌图，跳过（如为矢量页需另行渲染）')
            continue

        if img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')

        w, h = img.size
        if w > max_width:
            img = img.resize((max_width, int(h * max_width / w)), Image.LANCZOS)

        img.save(dest, 'JPEG', quality=quality, optimize=True)
        records.append({
            'page': page_no,
            'file': name,
            'size': list(img.size),
            'bytes': os.path.getsize(dest),
        })
        if page_no % 20 == 0 or page_no == end:
            print(f'  已完成 {page_no}/{end}')

    manifest_path = os.path.join(out_dir, 'manifest.json')
    old = []
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                old = json.load(f).get('pages', [])
        except Exception:
            old = []

    merged = {r['page']: r for r in old}
    for r in records:
        merged[r['page']] = r
    pages = [merged[k] for k in sorted(merged)]

    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump({
            'bookId': book_id,
            'source': pdf_path,
            'totalPages': total,
            'pages': pages,
        }, f, ensure_ascii=False, indent=2)

    done = [r for r in records if not r.get('skipped')]
    print('-' * 60)
    print(f'新抽取 {len(done)} 页，累计 {len(pages)} 页')
    if done:
        avg = sum(r['bytes'] for r in done) / len(done) / 1024
        print(f'平均每页 {avg:.0f} KB')
    print(f'manifest: {manifest_path}')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('book_id')
    ap.add_argument('--from', dest='page_from', type=int, default=1)
    ap.add_argument('--to', dest='page_to', type=int, default=None)
    ap.add_argument('--width', type=int, default=1400)
    ap.add_argument('--quality', type=int, default=82)
    a = ap.parse_args()
    extract(a.pdf, a.book_id, a.page_from, a.page_to, a.width, a.quality)
