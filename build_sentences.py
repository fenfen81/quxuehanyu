#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把《汉语教程》第二册（上）-全部课文原文及翻译.docx 的句子导入 content.ts。
规则（用户硬性要求）：
  - 拼音：直接使用 docx「拼音」列（分词形式，词内连写、词间空格；名字如 Tián Fāng 带内部空格）。
  - 分词(split)：直接采用 docx 拼音分词对应的中文词边界。
  - 英文：直接使用 docx「地道英文」列（句子级）。
  - dict 的逐词英文：docx 无此列，用 textbookDict 生词表 + 03_enrich 的 COMMON 兜底（看英打中需要）。
"""
import re, json, sys, os

DOCX = r"E:/我的教学资料/趣学汉语网站制作相关文件/我制作趣学汉语网站所需的一些教材材料/《汉语教程》第二册（上）的相关文件/《汉语教程》第二册上-全部课文原文及翻译.docx"
APP = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(APP, "src", "data", "content.ts")
TS_ENRICH = os.path.join(APP, "pipeline", "03_enrich.cjs")
TS_VOCAB = os.path.join(APP, "src", "data", "textbookDict.ts")

import docx
from docx.oxml.ns import qn

DRY_RUN = "--emit" not in sys.argv

# ---------- 1. 解析 COMMON ----------
def load_common():
    lines = open(TS_ENRICH, encoding="utf-8").read().splitlines()
    # COMMON 位于 const COMMON = { ... } 之间
    start = next(i for i, l in enumerate(lines) if l.strip().startswith("const COMMON = {"))
    # 找匹配的 }
    depth = 0
    end = None
    for i in range(start, len(lines)):
        for ch in lines[i]:
            if ch == "{": depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0 and i > start:
                    end = i
                    break
        if end is not None:
            break
    seg = "\n".join(lines[start:end])
    pairs = re.findall(r'"([^"]+)":\s*"((?:\\.|[^"\\])*)"', seg)
    return dict(pairs)

# ---------- 2. 解析 vocab 英文 (hanyu-jiaocheng-2a) ----------
def load_vocab_en():
    ts = open(TS_VOCAB, encoding="utf-8").read()
    i = ts.index("textbookId: 'hanyu-jiaocheng-2a'")
    block = ts[i:]
    pat = re.compile(r"hanzi:\s*'(?P<h>(?:\\.|[^'\\])*)'.*?english:\s*'(?P<e>(?:\\.|[^'\\])*)'", re.S)
    out = {}
    for m in pat.finditer(block):
        h = m.group("h").replace("\\'", "'").replace('\\"', '"').replace("\\\\", "\\")
        e = m.group("e").replace("\\'", "'").replace('\\"', '"').replace("\\\\", "\\")
        out[h] = e
    return out

# 补充 COMMON 缺失的极少常用词
SUPP = {
    "这": "this", "那": "that", "哪": "which", "谁": "who", "多": "many; much",
    "少": "few; little", "下": "to go down; next", "吃": "to eat", "喝": "to drink",
    "事情": "thing; matter", "上": "to go up; on", "里": "inside", "外": "outside",
    "前": "front; before", "后": "back; after", "左": "left", "右": "right",
    "中": "middle; in", "内": "inside", "没有": "not have; not", "没": "not",
    "别": "don't", "让": "to let; to make", "给": "to give; for", "跟": "with; and",
    "和": "and", "对": "to; correct", "能": "can", "会": "can; will",
}

# ---------- 3. 拼音 slot 计数（按隔音撇号分音节） ----------
def slot_count(tok):
    # tok 可含声调标记与撇号；先去声调再按音节计数（=应占汉字数）
    t = tok.lower().translate(_ACCENT)  # 去声调，保留撇号
    letters = re.sub(r"[^a-zü']", "", t)  # 保留撇号
    if not letters:
        return 0
    if not re.search(r"[aeiouü]", letters):
        return len(letters)  # 无元音（理论上不会）
    c = 0
    for seg in letters.split("'"):
        if not seg:
            continue
        c += len(re.findall(r"[aeiouü]+", seg))
        if seg.endswith("r") and len(seg) > 2:
            c += 1  # 儿化：尾 r 对应「儿」字，多占一个汉字（len>2 排除独立的 er 音节）
    return c

HANZI = re.compile(r"[一-鿿]")

def is_hanzi(ch):
    return bool(HANZI.match(ch))

# 带声调元音 -> 基础元音（去声调标记），保留 ü
_ACCENT = str.maketrans("āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ", "aaaaeeeeiiiioooouuuuüüüü")

def clean_py(tok):
    # 返回 (display_py, is_digit, digit_str)
    # display_py：转小写、撇号规范化、去标点，【保留声调标记】，忠实还原表格拼音
    disp = tok.lower().replace("’", "'").replace("‘", "'")
    disp = re.sub(r"[^a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ']", "", disp)
    if re.search(r"\d", tok):
        dig = re.sub(r"\D", "", tok)
        if dig:
            return ("", True, dig)
    if not disp:
        return (None, False, None)  # 纯标点 token，跳过
    return (disp, False, None)

# ---------- 4. 解析 docx 结构 ----------
def iter_blocks(d):
    body = d.element.body
    for child in body.iterchildren():
        if child.tag == qn("w:p"):
            texts = [t.text or "" for t in child.iter(qn("w:t"))]
            yield ("p", "".join(texts).strip())
        elif child.tag == qn("w:tbl"):
            yield ("tbl", child)

def parse_docx():
    d = docx.Document(DOCX)
    lessons = []
    cur_lesson = None
    cur_text = None
    for kind, payload in iter_blocks(d):
        if kind == "p":
            t = payload
            m = re.match(r"^第\s*(\d+)\s*课\s*(.*)$", t)
            if m:
                cur_lesson = {"num": int(m.group(1)), "title": t, "texts": []}
                lessons.append(cur_lesson)
                cur_text = None
                continue
            m2 = re.match(r"^课文\s*[（(]?\s*([一二三四五六七八九十]+|\d+)\s*[）)]?\s*[:：]?\s*(.*)$", t)
            if m2 and cur_lesson is not None:
                cur_text = {"label": "课文（%s）%s" % (m2.group(1), m2.group(2).strip()), "sentences": []}
                cur_lesson["texts"].append(cur_text)
                continue
            continue
        else:  # tbl
            if cur_text is None:
                continue
            rows = payload.findall(qn("w:tr"))
            for r in rows:
                cells = []
                for tc in r.findall(qn("w:tc")):
                    txt = "".join(n.text or "" for n in tc.iter(qn("w:t")))
                    cells.append(txt.strip())
                if not cells:
                    continue
                if cells[0] == "序号" or (len(cells) >= 2 and cells[1] == "拼音"):
                    continue  # 表头
                if len(cells) < 4:
                    continue
                py = cells[1].strip()
                cn = cells[2].strip()
                en = cells[3].strip()
                if not cn or not HANZI.search(cn):
                    continue
                cur_text["sentences"].append({"cn": cn, "py": py, "en": en})
    return lessons

# ---------- 5. 对齐：拼音逐音节 token -> 逐汉字（每个拼音 token = 一个词） ----------
def align_sentence(cn, py_raw, vocab_en, common):
    # 1) 表拼音 token：按「字母(含声调变音字)/撇号/数字 连写段」切分；标点（含 《》（）“” 。，？！…—）一律作分隔
    py_tokens = []  # (clean_py, is_digit, syl)
    for t in re.findall(r"[\w']+", py_raw):
        res = clean_py(t)
        if res[0] is None and not res[1]:
            continue  # 纯标点 token
        if res[1]:
            py_tokens.append(("", True, 0))
        else:
            py_tokens.append((res[0], False, slot_count(res[0])))
    # 2) cn 字符级序列（汉字 / 数字），标点丢弃
    cn_chars = []  # (ch, is_digit)
    for ch in cn:
        if is_hanzi(ch):
            cn_chars.append((ch, False))
        elif ch.isdigit():
            cn_chars.append((ch, True))
        # 标点丢弃
    N = len(cn_chars)
    # 3) 逐个拼音 token 消费对应数量的 cn 字符（syl 个汉字）
    ti = 0
    ci = 0
    words_out = []
    while ci < N:
        if ti >= len(py_tokens):
            return None, {"type": "cn_leftover", "cn": cn, "py": py_raw, "ci": ci}
        tk = py_tokens[ti]
        if tk[1]:  # 数字 token
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
                return None, {"type": "syl_overflow", "cn": cn, "py": py_raw,
                              "syl": syl, "ci": ci}
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
            ci += syl
            ti += 1
    if ti != len(py_tokens):
        return None, {"type": "token_leftover", "cn": cn, "py": py_raw,
                      "used": ti, "total": len(py_tokens)}
    return words_out, None

# ---------- 6. 主流程 ----------
def main():
    common = load_common()
    vocab_en = load_vocab_en()
    print(f"[info] COMMON={len(common)} vocabEn={len(vocab_en)}")
    lessons = parse_docx()
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
                dct = {w["word"]: (f"{w['py']} / {w['en']}" if w["en"] else f"{w['py']} /") for w in rw}
                sid = f"hj2a-l{les['num']}-t{ti}-s{si}"
                out_sents.append({
                    "id": sid, "cn": s["cn"], "split": split, "en": s["en"], "dict": dct,
                })
                total_s += 1
            out_texts.append({
                "id": f"hj2a-l{les['num']}-t{ti}",
                "label": tx["label"],
                "sentences": out_sents,
            })
        out_lessons.append({
            "id": f"lesson{les['num']}",
            "title": les["title"],
            "titleEn": f"Lesson {les['num']}",
            "texts": out_texts,
        })
    print(f"[info] 总句子数={total_s}  对齐失败={len(mismatches)}")
    for m in mismatches[:30]:
        print("  MISMATCH", m["type"], "|", m.get("cn"), "|", m.get("py"))
    # 保存中间结果
    with open(os.path.join(APP, "_sentences_build.json"), "w", encoding="utf-8") as f:
        json.dump({"lessons": out_lessons}, f, ensure_ascii=False, indent=1)
    print("[info] 已写 _sentences_build.json")
    if DRY_RUN:
        print("[dry-run] 未修改 content.ts")
    else:
        emit(out_lessons)
        print("[emit] 已更新 content.ts")

def emit(out_lessons):
    # 构造新的 hanyu-jiaocheng-2a 对象（JSON 风格，TS 兼容）
    obj = {
        "id": "hanyu-jiaocheng-2a",
        "categoryId": "comprehensive",
        "title": "《汉语教程》第二册（上）",
        "titleEn": "Chinese Course Vol.2A",
        "level": "初级",
        "lessons": out_lessons,
    }
    obj_str = json.dumps(obj, ensure_ascii=False, indent=2)
    # 缩进到 2 空格（json.dumps indent=2 已满足），但需包在数组元素里
    ts = open(CONTENT, encoding="utf-8").read()
    i = ts.index("id: 'hanyu-jiaocheng-2a'")
    # 找对象起点：向前找最后一个 '  {\n'（2 空格缩进的 {）
    start = ts.rfind("\n  {", 0, i)
    if start == -1:
        start = ts.rfind("\n {", 0, i)
    # 找对象终点：从 start 之后找第一个独立 '  },' 或 '  }' （2 空格）
    rest = ts[start+1:]
    # 匹配顶层闭合：行首为 '  }' 后跟 ',' 或文件尾
    m = re.search(r"\n  \},?\n", rest)
    if not m:
        m = re.search(r"\n  \}\s*$", rest)
    end = start + 1 + m.end()
    new_block = "  " + obj_str
    new_ts = ts[:start] + new_block + ts[end:]
    open(CONTENT, "w", encoding="utf-8").write(new_ts)
    print("[emit] 替换块完成")

if __name__ == "__main__":
    main()
