#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extract text from 汉语教程 PDF textbooks"""
import sys
sys.path.insert(0, 'pylibs')

import pypdf
import re

def extract_pdf(pdf_path, max_pages=None):
    """Extract text from PDF file"""
    reader = pypdf.PdfReader(pdf_path)
    total = len(reader.pages)
    end = min(total, max_pages) if max_pages else total
    
    print(f"PDF: {pdf_path}")
    print(f"Total pages: {total}")
    print(f"Extracting: 1-{end}")
    print("=" * 60)
    
    for i in range(end):
        text = reader.pages[i].extract_text()
        if text and text.strip():
            print(f"\n--- Page {i+1} ---")
            print(text.strip())

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    
    if len(sys.argv) < 2:
        print("Usage: python extract_pdf.py <pdf_path> [max_pages]")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else None
    extract_pdf(pdf_path, max_pages)
