#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把《汉语教程》第二册（下）-课文原文及翻译.xlsx 的句子导入 content.ts。
格式与 build_sentences.py（第二册上 docx）完全一致，复用其拼音逐音节对齐算法。
规则（与第二册上一致，用户硬性要求）：
  - 拼音：直接使用 xlsx「拼音」列（分词形式，词内连写、词间空格）。
  - 分词(split)：直接采用 xlsx 拼音分词对应的中文词边界。
  - 英文：直接使用 xlsx「地道英文」列（句子级）。
  - dict 逐词英文：xlsx 无此列，用 textbookDict 的 hanyu-jiaocheng-2b 生词表 + COMMON 兜底。
输出 bookId 'hanyu-jiaocheng-2b'，sentence id hj2b-lN-tM-sK（双引号 JSON，与 content.ts 现有 hj2a 一致）。
"""
import re, json, sys, os

XLSX = r"E:/我的教学资料/趣学汉语网站制作相关文件/我制作趣学汉语网站所需的一些教材材料/《汉语教程》第二册（下）的相关文件/《汉语教程》第二册-下-课文原文及翻译.xlsx"
APP = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(APP, "src", "data", "content.ts")
TS_ENRICH = os.path.join(APP, "pipeline", "03_enrich.cjs")
TS_VOCAB = os.path.join(APP, "src", "data", "textbookDict.ts")

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

# ---------- 2. 解析 vocab 英文 (hanyu-jiaocheng-2b) ----------
def load_vocab_en():
    ts = open(TS_VOCAB, encoding="utf-8").read()
    i = ts.index("textbookId: 'hanyu-jiaocheng-2b'")
    block = ts[i:]
    pat = re.compile(r"hanzi:\s*'(?P<h>(?:\\.|[^'\\])*)'.*?english:\s*'(?P<e>(?:\\.|[^'\\])*)'", re.S)
    out = {}
    for m in pat.finditer(block):
        h = m.group("h").replace("\\'", "'").replace('\\"', '"').replace("\\\\", "\\")
        e = m.group("e").replace("\\'", "'").replace('\\"', '"').replace("\\\\", "\\")
        out[h] = e
    return out

SUPP = {
    "这": "this", "那": "that", "哪": "which", "谁": "who", "多": "many; much",
    "少": "few; little", "下": "to go down; next", "吃": "to eat", "喝": "to drink",
    "事情": "thing; matter", "上": "to go up; on", "里": "inside", "外": "outside",
    "前": "front; before", "后": "back; after", "左": "left", "右": "right",
    "中": "middle; in", "内": "inside", "没有": "not have; not", "没": "not",
    "别": "don't", "让": "to let; to make", "给": "to give; for", "跟": "with; and",
    "和": "and", "对": "to; correct", "能": "can", "会": "can; will",
}

# ---------- 3. 拼音 slot 计数 ----------
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

# ---------- 4. 解析 xlsx 结构 ----------
def parse_xlsx():
    import zipfile
    from xml.etree import ElementTree as ET
    W = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
    z = zipfile.ZipFile(XLSX)
    data = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    rows = []
    for row in data.iter(W + 'row'):
        cells = []
        for c in row.findall(W + 'c'):
            t = c.get('t'); v = c.find(W + 'v'); isn = c.find(W + 'is')
            if t == 'inlineStr' and isn is not None:
                cells.append(''.join(x.text or '' for x in isn.iter(W + 't')))
            elif v is not None:
                cells.append(v.text)
            else:
                cells.append('')
        rows.append([c.replace(chr(10), ' ').strip() for c in cells])

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
        # 课文小标题：单元素行，含 （一）/（二） 或 "课文"
        if len(r) == 1 and re.search(r'[（(][一二三四五六七八九十]+[）)]|课文', r[0]):
            cur_text = {"label": r[0], "sentences": []}
            cur["texts"].append(cur_text)
            continue
        # 句子行：4列，序号为数字，原文含汉字
        if len(r) >= 4 and r[0].isdigit() and HANZI.search(r[2]):
            if cur_text is None:
                cur_text = {"label": "课文", "sentences": []}
                cur["texts"].append(cur_text)
            py = r[1]
            # 修正表格拼音笔误：原文「注意安全」被连写成 zhùyìānquán（缺分词空格）
            py = py.replace("zhùyìānquán", "zhù yì ān quán")
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
    vocab_en = load_vocab_en()
    print(f"[info] COMMON={len(common)} vocabEn(hj2b)={len(vocab_en)}")
    lessons = parse_xlsx()
    print(f"[info] 解析到 {len(lessons)} 课")
    out_lessons = []
    mismatches = []
    total_s = 0
    for li, les in enumerate(lessons, 1):
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
                sid = f"hj2b-l{les['num']}-t{ti}-s{si}"
                out_sents.append({"id": sid, "cn": s["cn"], "split": split, "en": s["en"], "dict": dct})
                total_s += 1
            out_texts.append({"id": f"hj2b-l{les['num']}-t{ti}", "label": tx["label"], "sentences": out_sents})
        out_lessons.append({"id": f"lesson{les['num']}", "title": les["title"], "titleEn": f"Lesson {les['num']}", "texts": out_texts})
    print(f"[info] 总句子数={total_s}  对齐失败={len(mismatches)}")
    for m in mismatches[:40]:
        print("  MISMATCH", m["type"], "|", m.get("cn"), "|", m.get("py"))
    with open(os.path.join(APP, "_sentences_2b.json"), "w", encoding="utf-8") as f:
        json.dump({"lessons": out_lessons}, f, ensure_ascii=False, indent=1)
    print("[info] 已写 _sentences_2b.json")
    if DRY_RUN:
        print("[dry-run] 未修改 content.ts；用 --emit 写入")
    else:
        emit(out_lessons)
        print("[emit] 已更新 content.ts")

def emit(out_lessons):
    obj = {
        "id": "hanyu-jiaocheng-2b",
        "categoryId": "comprehensive",
        "title": "《汉语教程》第二册（下）",
        "titleEn": "Chinese Course Vol.2B",
        "level": "初级",
        "lessons": out_lessons,
    }
    obj_str = json.dumps(obj, ensure_ascii=False, indent=2)
    # 整体缩进 2 空格，使其顶层属性与 content.ts 中其它书对象（缩进2）一致
    obj_indented = "\n".join(("  " + line) if line.strip() else line for line in obj_str.split("\n"))
    ts = open(CONTENT, encoding="utf-8").read()
    marker = '"id": "hanyu-jiaocheng-2a"'
    i = ts.index(marker)
    # 找到 hj2a 对象的开括号 {：从 id 向前找最近的 {
    open_idx = ts.rfind("{", 0, i)
    # 括号配对：从 open_idx 起找到与 hj2a 开括号匹配的闭合 }
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
        raise RuntimeError("未找到 hj2a 的闭合括号")
    tail = ts[close_idx + 1:]
    # 期望 hj2a 之后紧跟下一本书：格式为 ',  {' （逗号+空格+开括号）
    if tail.startswith(",  {"):
        # 把 hj2b 插在 hj2a 闭合 } 与下一本书 { 之间
        new_ts = ts[:close_idx + 1] + ",\n" + obj_indented + tail
    elif tail.lstrip().startswith("]"):
        # 兼容：hj2a 是最后一本，插到数组结束符 ] 之前
        new_ts = ts[:close_idx + 1] + ",\n" + obj_indented + tail
    else:
        raise RuntimeError("意外的 hj2a 结尾格式: " + repr(tail[:20]))
    open(CONTENT, "w", encoding="utf-8").write(new_ts)
    print("[emit] 在 hj2a 之后插入 hj2b 完成（括号配对定位，已避开 rfind 误判）")

if __name__ == "__main__":
    main()
