import re, os, subprocess

# Read content.ts to find all Chinese characters
with open('src/data/content.ts', 'r', encoding='utf-8') as f:
    content = f.read()

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

hanzi_dir = 'public/hanzi-data'
existing = set()
if os.path.exists(hanzi_dir):
    for f in os.listdir(hanzi_dir):
        if f.endswith('.json'):
            existing.add(f.replace('.json', ''))

missing = sorted(chars - existing)
print(f'Total unique chars: {len(chars)}')
print(f'Existing stroke data: {len(existing)}')
print(f'Missing: {len(missing)}')
if missing:
    print(f'Missing chars: {"".join(missing[:80])}')

    # Download using jsdelivr with char-code format, then rename
    downloaded = 0
    failed = 0
    for c in missing:
        code = hex(ord(c))[2:]
        # Try fetching from makemeahanzi via rawgithubusercontent
        url = f'https://raw.githubusercontent.com/chanind/hanzi-writer-data/master/data/{code}.json'
        out_path = os.path.join(hanzi_dir, f'{c}.json')

        # Try unpkg with the code format
        url2 = f'https://unpkg.com/hanzi-writer-data@2.0.1/data/{code}.json'

        for url_try in [url, url2]:
            try:
                result = subprocess.run(
                    ['curl', '-sL', '--connect-timeout', '5', '-o', out_path, url_try],
                    timeout=10, capture_output=True
                )
                if result.returncode == 0 and os.path.exists(out_path):
                    size = os.path.getsize(out_path)
                    if size > 100:
                        # Verify it's valid JSON
                        with open(out_path, 'r', encoding='utf-8') as f:
                            first_char = f.read(1)
                            if first_char in ('{', '['):
                                downloaded += 1
                                break
                    os.remove(out_path)
            except:
                pass

        if not os.path.exists(out_path) or os.path.getsize(out_path) < 100:
            failed += 1
            if os.path.exists(out_path):
                os.remove(out_path)
        else:
            pass  # already counted as downloaded

    print(f'Downloaded: {downloaded}, Failed: {failed}')

    # Alternative: try npm hanzi-writer-data package
    if failed > 0:
        print('Trying alternative method via npm package...')
