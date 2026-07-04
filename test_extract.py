import re, sys, json
sys.stdout.reconfigure(encoding='utf-8')
with open('src/data/content.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract sentence-level IDs (format: lXXtXsX) and their cn values
# The structure in content.ts is:
#   id: 'l3t1s1',
#   cn: "你学英语吗？",
# We need to match these pairs correctly

sentences = []
# Split by sentence blocks - find each sentence object
# Pattern: id: 'lXtXsX', ... cn: "...",
lines = content.split('\n')
current_id = None
for line in lines:
    id_match = re.search(r"id:\s*'([^']+)',", line)
    if id_match:
        current_id = id_match.group(1)
    cn_match = re.search(r'cn:\s*"([^"]+)"', line)
    if cn_match and current_id and re.match(r'^l\d+t\d+s\d+$', current_id):
        sentences.append({"id": current_id, "cn": cn_match.group(1)})
        current_id = None

print(f"Found {len(sentences)} sentences:")
for s in sentences:
    print(f"  {s['id']}: {s['cn'][:50]}")

# Also extract words from dict
words = set()
dict_pattern = r'"([^"]+)":\s*"([^"]*)"'
for m in re.finditer(dict_pattern, content):
    key = m.group(1)
    if any('\u4e00' <= c <= '\u9fff' for c in key):
        words.add(key)

print(f"\nFound {len(words)} unique words")
print(json.dumps(sorted(list(words)), ensure_ascii=False, indent=2)[:500])
