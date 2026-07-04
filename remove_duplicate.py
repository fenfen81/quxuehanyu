# -*- coding: utf-8 -*-
"""Remove duplicate HSK1 block from content.ts"""

content_ts = 'src/data/content.ts'

with open(content_ts, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 6210 (0-indexed: 6209) is "    },\n" - end of first HSK1 copy
# Line 6211 (0-indexed: 6210) is "    {\n" - start of second HSK1 copy
# Line 8562 (0-indexed: 8561) is "    }\n" - end of second HSK1 copy
# Line 8563 (0-indexed: 8562) is "]\n" - textbooks array close

# We need to:
# 1. Remove lines 6211-8562 (0-indexed: 6210-8561)
# 2. Change line 6210 from "    },\n" to "    }\n"

# Find the second "hsk-standard-1" occurrence
first_hsk1 = None
second_hsk1 = None
for i, line in enumerate(lines):
    if 'hsk-standard-1' in line:
        if first_hsk1 is None:
            first_hsk1 = i
        elif second_hsk1 is None:
            second_hsk1 = i
            break

print("First hsk-standard-1 at line:", first_hsk1 + 1)
print("Second hsk-standard-1 at line:", second_hsk1 + 1)

# The second HSK1 block starts at the "    {" line before second_hsk1
# Go back to find the opening brace
second_start = second_hsk1
while second_start > 0 and '{' not in lines[second_start]:
    second_start -= 1

print("Second HSK1 block opening brace at line:", second_start + 1)
print("Line content:", repr(lines[second_start]))

# The second HSK1 block ends at the "    }" line before the "]" that closes the textbooks array
# Find the "]" after the second HSK1 block
textbooks_close = None
for i in range(second_hsk1, len(lines)):
    if lines[i].strip() == ']':
        textbooks_close = i
        break

print("Textbooks array close at line:", textbooks_close + 1)
print("Line content:", repr(lines[textbooks_close]))

# The second HSK1 block is from second_start to textbooks_close - 1
# We need to remove lines[second_start:textbooks_close]
# But first, fix the comma on the line before second_start
# That line should be "    },\n" → change to "    }\n"

comma_line = second_start - 1
print("Comma line:", repr(lines[comma_line]))
lines[comma_line] = lines[comma_line].replace('},', '}')

# Remove the second HSK1 block
new_lines = lines[:second_start] + lines[textbooks_close:]

print("Old line count:", len(lines))
print("New line count:", len(new_lines))
print("Removed", len(lines) - len(new_lines), "lines")

with open(content_ts, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Done! Duplicate removed.")
