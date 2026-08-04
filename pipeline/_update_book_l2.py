import json

BOOK = r"C:/ProgramData/WorkBuddy/chromium-env/1365jvd/WorkBuddy/2026-06-16-11-47-45/app/pipeline/books/hanyu-jiaocheng-2a/book.json"
NEW = r"C:/ProgramData/WorkBuddy/chromium-env/1365jvd/WorkBuddy/2026-06-16-11-47-45/app/pipeline/_l2_new_sentences.json"

book = json.load(open(BOOK, encoding='utf-8'))
new = json.load(open(NEW, encoding='utf-8'))

# Corrected pinyin for lesson-2 words (light tones fixed)
PINYIN_FIX = {
    "大夫": "dài fu",
    "病人": "bìng rén",
    "肚子": "dù zi",
    "厉害": "lì hai",
    "了": "le",
    "片": "piàn",
    "拉肚子": "lā dù zi",
    "鱼": "yú",
    "牛肉": "niú rou",
    "化验": "huà yàn",
    "大便": "dà biàn",
    "小便": "xiǎo biàn",
    "检查": "jiǎn chá",
    "结果": "jié guǒ",
    "出来": "chū lai",
    "得": "dé",
    "肠炎": "cháng yán",
    "消化": "xiāo huà",
    "开（药）": "kāi yào",
    "打针": "dǎ zhēn",
    "后": "hòu",
    "哭": "kū",
    "寂寞": "jì mò",
    "所以": "suǒ yi",
    "难过": "nán guo",
    "别": "bié",
    "礼堂": "lǐ táng",
    "舞会": "wǔ huì",
    "跳舞": "tiào wu",
}

# Find lesson 2
l2 = None
for L in book['lessons']:
    if L['lessonNum'] == 2:
        l2 = L
        break
assert l2 is not None, "lesson 2 not found"

# Replace texts with new sentences
l2['texts'] = [
    {
        "label": "课文一：你怎么了",
        "sentences": [{"cn": s["cn"], "en": s["en"]} for s in new["lesson1"]]
    },
    {
        "label": "课文二：玛丽哭了",
        "sentences": [{"cn": s["cn"], "en": s["en"]} for s in new["lesson2"]]
    },
]

# Add corrected pinyin to each word (enrich respects explicit pinyin)
missing = []
for w in l2['words']:
    h = w['hanzi']
    if h in PINYIN_FIX:
        w['pinyin'] = PINYIN_FIX[h]
    else:
        missing.append(h)
assert not missing, f"Missing pinyin for: {missing}"

# Lesson 1 left unchanged
json.dump(book, open(BOOK, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print("book.json updated.")
print(f"  lesson2 texts: {len(l2['texts'])} texts, {sum(len(t['sentences']) for t in l2['texts'])} sentences")
print(f"  lesson2 words: {len(l2['words'])} (all have pinyin: {all('pinyin' in w for w in l2['words'])})")
print(f"  lesson1 untouched: {len(book['lessons'][0]['words'])} words, {sum(len(t['sentences']) for t in book['lessons'][0]['texts'])} sentences")
