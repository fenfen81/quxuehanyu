# -*- coding: utf-8 -*-
"""Insert HSK1 textbook data into content.ts"""
import os

content_ts = 'src/data/content.ts'
hsk1_file = 'hsk1_content.ts.txt'

with open(content_ts, 'r', encoding='utf-8') as f:
    content = f.read()

with open(hsk1_file, 'r', encoding='utf-8') as f:
    hsk1_code = f.read()

# Find the insertion point
idx = content.rfind('    }\n]')
if idx == -1:
    idx = content.rfind('}\n]')
    print("Using alternate pattern at index", idx)

print("Found insertion point at index", idx)
context = content[idx-20:idx+20]
print("Context:", repr(context))

# Insert: replace '    }\n]' with '    },\n<NEW>\n]'
new_content = content[:idx] + '    },\n' + hsk1_code + '\n' + content[idx+5:]

print("Old length:", len(content))
print("New length:", len(new_content))
print("Inserted", len(new_content) - len(content), "chars")

with open(content_ts, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done! content.ts updated.")
