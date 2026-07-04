import re, os, subprocess

# Read content.ts to find all Chinese characters
with open('src/data/content.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract all Chinese characters from cn and split fields
cn_pattern = re.compile(r'cn:\s*"([^"]+)"', re.DOTALL)
split_pattern = re.compile(r'split:\s*"([^"]+)"', re.DOTALL)

chars = set()
for m in cn_pattern.finditer(content):
    for c in m.group(1):
        if '\u4e00' <= c <= '\u9fff':
            chars.add(c)
for m in split_pattern.finditer(content):
    for c in m.group(1):
        if '\u4e00' <= c <= '\u9fff':
            chars.add(c)

# Check which characters don't have stroke data yet
hanzi_dir = 'public/hanzi-data'
existing = set()
if os.path.exists(hanzi_dir):
    for f in os.listdir(hanzi_dir):
        if f.endswith('.json'):
            char_code = f.replace('.json', '')
            existing.add(char_code)

# Convert char to unicode code point (like hanzi-writer format)
missing = []
for c in sorted(chars):
    code = hex(ord(c))[2:]
    if code not in existing:
        missing.append((c, code))

print(f'Total unique chars: {len(chars)}')
print(f'Existing stroke data: {len(existing)}')
print(f'Missing: {len(missing)}')
if missing:
    missing_chars = ''.join(c for c, _ in missing[:80])
    print(f'Missing chars: {missing_chars}')

    # Download missing stroke data
    downloaded = 0
    failed = 0
    for c, code in missing:
        url = f'https://unpkg.com/hanzi-writer-data@latest/data/{code}.json'
        out_path = os.path.join(hanzi_dir, f'{code}.json')
        try:
            result = subprocess.run(
                ['curl', '-sL', '-o', out_path, url],
                timeout=10, capture_output=True
            )
            if result.returncode == 0 and os.path.exists(out_path) and os.path.getsize(out_path) > 100:
                downloaded += 1
            else:
                failed += 1
                if os.path.exists(out_path):
                    os.remove(out_path)
        except Exception as e:
            failed += 1

    print(f'Downloaded: {downloaded}, Failed: {failed}')
