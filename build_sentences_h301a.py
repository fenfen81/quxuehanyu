#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把《汉语会话301句》上册-课文原文及翻译.xlsx 的句子导入 content.ts。
复用 build_sentences_2b.py 的拼音逐音节对齐算法。
规则：
  - 拼音：直接使用 xlsx「拼音」列（分词形式）。
  - 分词(split)：由拼音列逐音节对齐得到中文词边界。
  - 英文：直接使用 xlsx「地道英文」列（句子级）。
  - dict 逐词英文：优先用《汉语会话301句》上册-生词表.xlsx 的本课生词英文，
    再叠加 03_enrich.cjs 的 COMMON 词表与 SUPP 常用词；无英文的词不写入 dict。
输出 bookId 'hanyu-huihua-301-1a'（口语类 oral），sentence id h301a-lN-tM-sK。
"""
import re, json, sys, os

XLSX = r"E:/我的教学资料/趣学汉语网站制作相关文件/我制作趣学汉语网站所需的一些教材材料/《汉语会话301句》上册 的相关文件/《汉语会话301句》上册 课文原文及翻译.xlsx"
VOCAB_XLSX = r"E:/我的教学资料/趣学汉语网站制作相关文件/我制作趣学汉语网站所需的一些教材材料/《汉语会话301句》上册 的相关文件/汉语会话301句上册-生词表.xlsx"
APP = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(APP, "src", "data", "content.ts")
TS_ENRICH = os.path.join(APP, "pipeline", "03_enrich.cjs")

DRY_RUN = "--emit" not in sys.argv

# ---------- 1. 解析 COMMON ----------
def load_common():
    lines = open(TS_ENRICH, encoding="utf-8").read().splitlines()
    start = next(i for i, l in enumerate(lines) if l.strip().startswith("const COMMON = {"))
    depth = 0; end = None
    for i in range(start, len(lines)):
        for ch in lines[i]:
            if ch == "{": depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0 and i > start:
                    end = i; break
        if end is not None: break
    seg = "\n".join(lines[start:end])
    pairs = re.findall(r'"([^"]+)":\s*"((?:\\.|[^"\\])*)"', seg)
    return dict(pairs)

# ---------- 2. 解析生词表 xlsx（按课：hanzi -> english） ----------
def load_vocab_en():
    W = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
    import zipfile
    from xml.etree import ElementTree as ET
    z = zipfile.ZipFile(VOCAB_XLSX)
    ss = []
    if 'xl/sharedStrings.xml' in z.namelist():
        root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in root.findall(W + 'si'):
            ss.append(''.join(t.text or '' for t in si.iter(W + 't')))
    data = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    out = {}  # lesson_num -> {hanzi: english}
    cur = None
    for row in data.iter(W + 'row'):
        cells = {}
        for c in row.findall(W + 'c'):
            ref = c.get('r'); col = re.match(r'([A-Z]+)', ref).group(1) if ref else '?'
            t = c.get('t'); v = c.find(W + 'v'); isn = c.find(W + 'is')
            if t == 'inlineStr' and isn is not None:
                val = ''.join(x.text or '' for x in isn.iter(W + 't'))
            elif v is not None:
                val = ss[int(v.text)] if t == 's' else v.text
            else:
                val = ''
            cells[col] = val.strip()
        r = [cells.get(col, '') for col in sorted(cells)]
        m = re.match(r'^第\s*(\d+)\s*课', r[0])
        if len(r) == 1 and m:
            cur = int(m.group(1)); out[cur] = {}
            continue
        if cur is None: continue
        # 行：序号 / 生词 / 拼音 / 词性 / 英文释义 / 中文例句 / 例句英译
        if r[0].isdigit() and re.search(r'[\u4e00-\u9fff]', r[1]):
            if len(r) >= 5 and r[4]:
                out[cur][r[1]] = r[4]
    return out

SUPP = {
    "这": "this", "那": "that", "哪": "which", "谁": "who", "多": "many; much",
    "少": "few; little", "下": "to go down; next", "吃": "to eat", "喝": "to drink",
    "事情": "thing; matter", "上": "to go up; on", "里": "inside", "外": "outside",
    "前": "front; before", "后": "back; after", "左": "left", "右": "right",
    "中": "middle; in", "内": "inside", "没有": "not have; not", "没": "not",
    "别": "don't", "让": "to let; to make", "给": "to give; for", "跟": "with; and",
    "和": "and", "对": "to; correct", "能": "can", "会": "can; will",
    "她": "she; her", "他": "he; him", "它": "it", "我": "I; me", "你": "you",
    "们": "(plural suffix)", "了": "already; (particle)", "吗": "(question particle)",
    "呢": "(question particle)", "吧": "(suggestion particle)", "啊": "(exclamation)",
    "的": "of; (possessive)", "地": "de (adverbial particle)", "得": "de (complement particle)",
    "一": "one", "二": "two", "三": "three", "四": "four", "五": "five",
    "六": "six", "七": "seven", "八": "eight", "九": "nine", "十": "ten",
    "几": "how many", "半": "half", "两": "two", "零": "zero", "百": "hundred",
    "千": "thousand", "万": "ten thousand", "块": "yuan (colloquial); piece",
    "毛": "mao (10 cents)", "分": "minute; cent", "元": "yuan", "点": "o'clock; a little",
    "很": "very", "也": "also; too", "都": "all; both", "就": "just; then",
    "才": "only then", "再": "again", "又": "again; also", "还": "still; also",
    "真": "really", "太": "too; very", "挺": "very; quite", "好": "good; well",
    "是": "to be", "有": "to have", "在": "at; in; on", "从": "from", "到": "to; arrive",
}

# ---------- 3. 拼音 slot 计数（与 build_sentences_2b.py 相同） ----------
_ACCENT = str.maketrans("āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ", "aaaaeeeeiiiioooouuuuüüüü")
HANZI = re.compile(r"[一-鿿]")

def is_hanzi(ch):
    return bool(HANZI.match(ch))

def slot_count(tok):
    t = tok.lower().translate(_ACCENT)
    letters = re.sub(r"[^a-zü']", "", t)
    if not letters:
        return 0
    if not re.search(r"[aeiouü]", letters):
        return len(letters)
    c = 0
    for seg in letters.split("'"):
        if not seg: continue
        c += len(re.findall(r"[aeiouü]+", seg))
        if seg.endswith("r") and len(seg) > 2:
            c += 1
    return c

def clean_py(tok):
    disp = tok.lower().replace("’", "'").replace("‘", "'")
    disp = re.sub(r"[^a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ']", "", disp)
    if re.search(r"\d", tok):
        dig = re.sub(r"\D", "", tok)
        if dig:
            return ("", True, dig)
    if not disp:
        return (None, False, None)
    return (disp, False, None)

# ---------- 4. 解析课文 xlsx ----------
def parse_xlsx():
    import zipfile
    from xml.etree import ElementTree as ET
    W = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
    z = zipfile.ZipFile(XLSX)
    ss = []
    if 'xl/sharedStrings.xml' in z.namelist():
        root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in root.findall(W + 'si'):
            ss.append(''.join(t.text or '' for t in si.iter(W + 't')))
    data = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    rows = []
    for row in data.iter(W + 'row'):
        cells = {}
        for c in row.findall(W + 'c'):
            ref = c.get('r'); col = re.match(r'([A-Z]+)', ref).group(1) if ref else '?'
            t = c.get('t'); v = c.find(W + 'v'); isn = c.find(W + 'is')
            if t == 'inlineStr' and isn is not None:
                val = ''.join(x.text or '' for x in isn.iter(W + 't'))
            elif v is not None:
                val = ss[int(v.text)] if t == 's' else v.text
            else:
                val = ''
            cells[col] = val.strip()
        r = [cells.get(col, '') for col in sorted(cells)]
        rows.append(r)

    lessons = []
    cur = None; cur_text = None
    for r in rows:
        if not r: continue
        m = re.match(r'^第\s*(\d+)\s*课\s*(.*)$', r[0])
        if len(r) == 1 and m:
            cur = {"num": int(m.group(1)), "title": r[0], "texts": []}
            lessons.append(cur); cur_text = None
            continue
        if cur is None: continue
        # 会话小节标题：单元素行，含（一）（二）等或"课文"
        if len(r) == 1 and re.search(r'[（(][一二三四五六七八九十]+[）)]|课文|会话|会\s*话', r[0]):
            cur_text = {"label": r[0].replace("会 话", "会话").replace("会　话", "会话"), "sentences": []}
            cur["texts"].append(cur_text)
            continue
        # 句子行：序号为数字，原文（第3列）含汉字
        if len(r) >= 4 and r[0].isdigit() and HANZI.search(r[2]):
            if cur_text is None:
                cur_text = {"label": "会话", "sentences": []}
                cur["texts"].append(cur_text)
            py = r[1]
            # 修正表格拼音笔误：原文「在。」（单字）被误标成 Zàijiā。（多出 jiā 音节）
            if r[2] == "在。" and re.match(r'^Zàijiā[。\s]', py):
                py = "Zài。"
            cur_text["sentences"].append({"cn": r[2], "py": py, "en": r[3]})
    return lessons

# ---------- 5. 对齐 ----------
def align_sentence(cn, py_raw, vocab_en, common):
    py_tokens = []
    for t in re.findall(r"[\w']+", py_raw):
        res = clean_py(t)
        if res[0] is None and not res[1]:
            continue
        if res[1]:
            py_tokens.append(("", True, 0))
        else:
            py_tokens.append((res[0], False, slot_count(res[0])))
    cn_chars = []
    for ch in cn:
        if is_hanzi(ch):
            cn_chars.append((ch, False))
        elif ch.isdigit():
            cn_chars.append((ch, True))
    N = len(cn_chars)
    ti = 0; ci = 0; words_out = []
    while ci < N:
        if ti >= len(py_tokens):
            return None, {"type": "cn_leftover", "cn": cn, "py": py_raw, "ci": ci}
        tk = py_tokens[ti]
        if tk[1]:
            if not cn_chars[ci][1]:
                return None, {"type": "digit_no_char", "cn": cn, "py": py_raw}
            dig = []
            while ci < N and cn_chars[ci][1]:
                dig.append(cn_chars[ci][0]); ci += 1
            words_out.append({"word": "".join(dig), "py": "", "en": ""})
            ti += 1
        else:
            syl = tk[2]
            if ci + syl > N:
                return None, {"type": "syl_overflow", "cn": cn, "py": py_raw, "syl": syl, "ci": ci}
            chars = []
            bad = False
            for k in range(syl):
                ch, is_d = cn_chars[ci + k]
                if is_d:
                    bad = True; break
                chars.append(ch)
            if bad:
                return None, {"type": "syl_hit_digit", "cn": cn, "py": py_raw, "ci": ci}
            word = "".join(chars)
            en = vocab_en.get(word) or common.get(word) or SUPP.get(word) or ""
            words_out.append({"word": word, "py": tk[0], "en": en})
            ci += syl; ti += 1
    if ti != len(py_tokens):
        return None, {"type": "token_leftover", "cn": cn, "py": py_raw, "used": ti, "total": len(py_tokens)}
    return words_out, None

# ---------- 6. 主流程 ----------
def main():
    common = load_common()
    vocab_en_by_lesson = load_vocab_en()
    print(f"[info] COMMON={len(common)} 生词表课数={len(vocab_en_by_lesson)}")
    lessons = parse_xlsx()
    print(f"[info] 解析到 {len(lessons)} 课")
    out_lessons = []
    mismatches = []
    total_s = 0
    total_dk = 0
    for les in lessons:
        vocab_en = vocab_en_by_lesson.get(les["num"], {})
        out_texts = []
        for ti, tx in enumerate(les["texts"], 1):
            out_sents = []
            for si, s in enumerate(tx["sentences"], 1):
                rw, err = align_sentence(s["cn"], s["py"], vocab_en, common)
                if err:
                    mismatches.append(err)
                    continue
                split = " ".join(w["word"] for w in rw)
                dct = {w["word"]: f"{w['py']} / {w['en']}" for w in rw if w["en"]}
                sid = f"h301a-l{les['num']}-t{ti}-s{si}"
                out_sents.append({"id": sid, "cn": s["cn"], "split": split, "en": s["en"], "dict": dct})
                total_s += 1
                total_dk += len(dct)
            out_texts.append({"id": f"h301a-l{les['num']}-t{ti}", "label": tx["label"], "sentences": out_sents})
        out_lessons.append({"id": f"lesson{les['num']}", "title": les["title"], "titleEn": f"Lesson {les['num']}", "texts": out_texts})
    print(f"[info] 总句子数={total_s}  dict词条数={total_dk}  对齐失败={len(mismatches)}")
    for m in mismatches[:40]:
        print("  MISMATCH", m["type"], "|", m.get("cn"), "|", m.get("py"))
    with open(os.path.join(APP, "_sentences_h301a.json"), "w", encoding="utf-8") as f:
        json.dump({"lessons": out_lessons}, f, ensure_ascii=False, indent=1)
    print("[info] 已写 _sentences_h301a.json")
    if DRY_RUN:
        print("[dry-run] 未修改 content.ts；用 --emit 写入")
    else:
        emit(out_lessons)
        print("[emit] 已更新 content.ts")

def emit(out_lessons):
    obj = {
        "id": "hanyu-huihua-301-1a",
        "categoryId": "oral",
        "title": "《汉语会话301句》上册",
        "titleEn": "Conversational Chinese 301 Vol.1",
        "level": "初级",
        "lessons": out_lessons,
    }
    obj_str = json.dumps(obj, ensure_ascii=False, indent=2)
    obj_indented = "\n".join(("  " + line) if line.strip() else line for line in obj_str.split("\n"))
    ts = open(CONTENT, encoding="utf-8").read()
    marker = '"id": "hanyu-jiaocheng-2b"'
    i = ts.index(marker)
    open_idx = ts.rfind("{", 0, i)
    depth = 0
    close_idx = -1
    for j in range(open_idx, len(ts)):
        if ts[j] == "{":
            depth += 1
        elif ts[j] == "}":
            depth -= 1
            if depth == 0:
                close_idx = j
                break
    if close_idx == -1:
        raise RuntimeError("未找到 hj2b 的闭合括号")
    tail = ts[close_idx + 1:]
    # hj2b 是当前最后一本：闭合 } 后应为 ']'（textbooks 数组结束符）
    stripped = tail.lstrip()
    if stripped.startswith("]"):
        new_ts = ts[:close_idx + 1] + ",\n" + obj_indented + tail
    else:
        raise RuntimeError("意外的 hj2b 结尾格式: " + repr(tail[:20]))
    open(CONTENT, "w", encoding="utf-8").write(new_ts)
    print("[emit] 已在 textbooks 数组末尾（hj2b 之后）插入 hanyu-huihua-301-1a（括号配对定位）")

if __name__ == "__main__":
    main()
