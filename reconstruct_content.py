# -*- coding: utf-8 -*-
"""Reconstruct content.ts from broken state"""

content_ts = 'src/data/content.ts'
hsk1_file = 'hsk1_content.ts.txt'

with open(content_ts, 'r', encoding='utf-8') as f:
    broken = f.read()

with open(hsk1_file, 'r', encoding='utf-8') as f:
    hsk1_code = f.read()

# Extract original textbooks data from the broken file
# It starts after "] = [" and ends before the export functions
# Find "] = [" marker
marker = '] = ['
marker_idx = broken.find(marker)
if marker_idx == -1:
    print("ERROR: Cannot find marker")
    exit(1)

# The original textbooks data starts after "] = ["
orig_textbooks_start = marker_idx + len(marker)
# The original textbooks data ends at "\n]\n\nexport function"
export_fn_marker = '\n]\n\nexport function'
export_fn_idx = broken.find(export_fn_marker, orig_textbooks_start)
if export_fn_idx == -1:
    print("ERROR: Cannot find export function marker")
    exit(1)

orig_textbooks = broken[orig_textbooks_start:export_fn_idx]
# orig_textbooks now contains the textbook objects, ending with "\n    }\n"
# We need to strip the trailing closing bracket area

print("Original textbooks data length:", len(orig_textbooks))
print("First 100 chars:", repr(orig_textbooks[:100]))
print("Last 100 chars:", repr(orig_textbooks[-100:]))

# The original textbooks data looks like:
#     {
#       id: 'hanyu-jiaocheng-1a',
#       ...
#     },
#     {
#       id: 'hanyu-jiaocheng-1b',
#       ...
#     }
#
# It ends with "    }\n" (no comma after the last textbook)

# We need to add a comma after the last textbook, then add the HSK1 block

# Reconstruct the file
header = """import type { Category, CategorySlug, Textbook } from '@/types'

export const categories: Category[] = [
  { slug: 'comprehensive', name: '综合汉语', nameEn: 'Comprehensive Chinese', description: '系统学习听、说、读、写，全面提高汉语水平', icon: '📚' },
  { slug: 'hsk', name: 'HSK 考试类', nameEn: 'HSK Exam Prep', description: '针对 HSK 各等级考试进行专项训练', icon: '📝' },
  { slug: 'oral', name: '口语类', nameEn: 'Oral Chinese', description: '聚焦日常对话与口语表达，开口说汉语', icon: '🗣️' },
  { slug: 'vocational', name: '中文+职业技能', nameEn: 'Chinese + Vocational Skills', description: '结合职业场景学习专业汉语', icon: '💼' }
]

export const textbooks: Textbook[] = [
"""

# The original textbooks data ends with "    }\n" (last textbook closing brace)
# We need to add a comma, then the HSK1 block, then close the array

# Strip trailing whitespace from orig_textbooks
orig_textbooks_stripped = orig_textbooks.rstrip()

# The HSK1 block starts with "    {" and ends with "    }"
# We need to add it after the original textbooks

footer = """
]

export function getTextbookById(id: string): Textbook | undefined {
  return textbooks.find((t) => t.id === id)
}

export function getTextbooksByCategory(categoryId: CategorySlug): Textbook[] {
  return textbooks.filter((t) => t.categoryId === categoryId)
}
"""

# Build the final content
new_content = header + orig_textbooks_stripped + ',\n' + hsk1_code.rstrip() + footer

# Write the file
with open(content_ts, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("File reconstructed! Length:", len(new_content))

# Verify
print("\n--- Verification ---")
print("Has import:", "import type" in new_content[:100])
print("Has categories:", "export const categories" in new_content)
print("Has textbooks:", "export const textbooks" in new_content)
print("Has HSK1:", "hsk-standard-1" in new_content)
print("Has hanyu-jiaocheng-1a:", "hanyu-jiaocheng-1a" in new_content)
print("Has getTextbookById:", "getTextbookById" in new_content)
