# -*- coding: utf-8 -*-
"""Fix content.ts - remove wrongly inserted HSK1 data and insert at correct position"""

content_ts = 'src/data/content.ts'

with open(content_ts, 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Extract the HSK1 block
# It starts with "    {\n      id: 'hsk-standard-1'," and ends with the matching closing brace
hsk1_start_marker = "    {\n      id: 'hsk-standard-1',"
hsk1_start = content.find(hsk1_start_marker)
if hsk1_start == -1:
    print("ERROR: Cannot find HSK1 block start")
    exit(1)

# Find the end of the HSK1 block by counting braces
# The block starts with "    {" and we need to find the matching "    }"
brace_count = 0
i = hsk1_start
while i < len(content):
    if content[i] == '{':
        brace_count += 1
    elif content[i] == '}':
        brace_count -= 1
        if brace_count == 0:
            # Found the matching closing brace
            # Include the closing brace and any trailing newline
            hsk1_end = i + 1
            # Skip trailing newline
            if hsk1_end < len(content) and content[hsk1_end] == '\n':
                hsk1_end += 1
            break
    i += 1

hsk1_block = content[hsk1_start:hsk1_end]
print("HSK1 block found, length:", len(hsk1_block))
print("First 80 chars:", repr(hsk1_block[:80]))
print("Last 80 chars:", repr(hsk1_block[-80:]))

# Step 2: Remove the HSK1 block from the wrong position
content_without_hsk1 = content[:hsk1_start] + content[hsk1_end:]

# Step 3: Fix the categories array
# The categories array should end with:
#   { slug: 'vocational', ... },
# ]
# But now it might have extra spaces or missing ]
# Let's find and fix it

# The categories array closing should be:
# "icon: '💼'     },\n]\n\nexport const textbooks"
# Let's check what it looks like now
cat_end_marker = "icon: '💼'"
cat_end_idx = content_without_hsk1.find(cat_end_marker)
if cat_end_idx == -1:
    print("ERROR: Cannot find categories end marker")
    exit(1)

# Find the next newline after this
nl_after = content_without_hsk1.find('\n', cat_end_idx)
context_after_cat = content_without_hsk1[nl_after:nl_after+100]
print("Context after categories:", repr(context_after_cat[:80]))

# The correct structure should be:
# icon: '💼' },
# ]
#
# export const textbooks: Textbook[] = [
#     {
#       id: 'hanyu-jiaocheng-1a',
#       ...
#     }
# ]

# Step 4: Find the textbooks array and its end
textbooks_start = content_without_hsk1.find("export const textbooks: Textbook[] = [")
if textbooks_start == -1:
    print("ERROR: Cannot find textbooks array")
    exit(1)

print("Textbooks array starts at index:", textbooks_start)

# Find the end of the textbooks array by counting brackets
# Start from the opening [
bracket_start = content_without_hsk1.find('[', textbooks_start)
bracket_count = 0
i = bracket_start
while i < len(content_without_hsk1):
    if content_without_hsk1[i] == '[':
        bracket_count += 1
    elif content_without_hsk1[i] == ']':
        bracket_count -= 1
        if bracket_count == 0:
            textbooks_end = i
            break
    i += 1

print("Textbooks array ends at index:", textbooks_end)
print("Context around textbooks end:", repr(content_without_hsk1[textbooks_end-30:textbooks_end+30]))

# Step 5: Insert the HSK1 block before the textbooks array closing bracket
# We need to insert: ",\n" + hsk1_block + "\n" before the "]"
# But we also need to check what's before the "]"
before_bracket = content_without_hsk1[textbooks_end-10:textbooks_end]
print("Before bracket:", repr(before_bracket))

# The textbooks array should end with:
#     }
# ]
# We want to change it to:
#     },
#     <HSK1 block>
# ]

# Find the last "}" before the "]"
last_brace = content_without_hsk1.rfind('}', textbooks_start, textbooks_end)
print("Last brace before bracket at:", last_brace)
print("Context:", repr(content_without_hsk1[last_brace:textbooks_end+1]))

# Insert the HSK1 data after the last brace, before the ]
# Change: "    }\n]" to "    },\n" + hsk1_block + "\n]"
new_content = (
    content_without_hsk1[:last_brace+1] +
    ',\n' +
    hsk1_block +
    '\n' +
    content_without_hsk1[textbooks_end:]
)

# Verify the structure
print("\n--- Verification ---")
# Check categories array is intact
cat_idx = new_content.find("export const categories:")
print("Categories array starts at:", cat_idx)

# Check textbooks array
tb_idx = new_content.find("export const textbooks:")
print("Textbooks array starts at:", tb_idx)

# Check HSK1 data is in textbooks array
hsk1_in_tb = new_content.find("hsk-standard-1", tb_idx)
print("HSK1 data found in textbooks array at:", hsk1_in_tb)

# Check it's NOT in categories array
hsk1_in_cat = new_content.find("hsk-standard-1", cat_idx, tb_idx)
print("HSK1 data in categories array:", hsk1_in_cat, "(should be -1)")

# Write the fixed file
with open(content_ts, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("\nFile fixed! Old length:", len(content), "New length:", len(new_content))
