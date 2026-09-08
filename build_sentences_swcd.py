#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""《想说就说·商务汉语口语完全手册》课文 → content.ts（中文+职业技能 vocational）。
结构：Unit N → Scene N → ■说话人 → 句子（序号|拼音|原文|英文）。
难点：139 句原文含阿拉伯数字（2015/3000/5月20日/TT-110），拼音列写的是汉字读音，
      需用 _numread 把读音 token 解析成数值并与原文数字串按序匹配。
"""
import re, json, sys, os
from xml.etree import ElementTree as ET
import zipfile
from pypinyin import lazy_pinyin, Style
import _numread as NR

XLSX = r"E:/我的教学资料/趣学汉语网站制作相关文件/我制作趣学汉语网站所需的一些教材材料/《想说就说·商务汉语口语完全手册》/《想说就说·商务汉语口语完全手册》-课文原文及翻译（全10单元）.xlsx"
VOCAB_XLSX = r"E:/我的教学资料/趣学汉语网站制作相关文件/我制作趣学汉语网站所需的一些教材材料/《想说就说·商务汉语口语完全手册》/《想说就说·商务汉语口语完全手册》-生词表.xlsx"
APP = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(APP, "src", "data", "content.ts")
TS_ENRICH = os.path.join(APP, "pipeline", "03_enrich.cjs")

SID_PREFIX = "swcd"
DRY_RUN = "--emit" not in sys.argv

W = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
HAN = re.compile(r"[一-鿿]")


def parse_xlsx(path):
    z = zipfile.ZipFile(path); ss = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall(W + 'si'):
            ss.append(''.join(t.text or '' for t in si.iter(W + 't')))
    rows = []
    for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).iter(W + 'row'):
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
            cells[col] = (val or '').strip()
        rows.append([cells.get(k, '') for k in sorted(cells)])
    return rows


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
    return dict(re.findall(r'"([^"]+)":\s*"((?:\\.|[^"\\])*)"', seg))


def load_vocab_en():
    """本书生词表：hanzi -> english（全书，不按单元）"""
    out = {}
    for r in parse_xlsx(VOCAB_XLSX):
        if not r: continue
        if len(r) >= 5 and r[0].isdigit() and HAN.search(r[1]) and r[4]:
            out.setdefault(r[1], r[4])
    return out


# ---------- 拼音 slot 计数 ----------
_ACC = NR._ACC


def slot_count(tok):
    s = NR.strip_tone(tok)
    if not s: return 0
    if not re.search(r"[aeiouü]", s): return len(s)
    c = 0
    for seg in s.split("'"):
        if not seg: continue
        c += len(re.findall(r"[aeiouü]+", seg))
        if seg.endswith("r") and len(seg) > 2: c += 1
    return c


def tokenize_py(py):
    """→ [{'kind':'syl'|'amb'|'lit', 't':tok, 'n':音节数, 'v':数字值?}]
    'amb' = 读音既可能是数字（八/十/百/千/零…）也可能是普通同音字（吧/是/一…），
            是否按数字处理由 align 结合「原文是否有待匹配的阿拉伯数字串」决定。"""
    out = []
    for raw in re.findall(r"[A-Za-z\u00c0-\u024f0-9'\-]+", py):
        m = re.match(r"^([A-Za-z]+)[-–](.+)$", raw)  # 如 TT-yāo
        if m:
            out.append({'kind': 'lit', 't': m.group(1)}); raw = m.group(2)
        n0 = slot_count(raw)
        if re.fullmatch(r"[A-Za-z]+", raw) and NR.num_of_token(raw) is None:
            # 轻声拼音（de/ma/ba/a…）与真正的英文字面（TT/A）都长这样：
            # 记 n，align 时先试字面匹配，匹配不上再按音节消耗汉字
            out.append({'kind': 'lit', 't': raw, 'n': n0}); continue
        if re.fullmatch(r"\d+", raw):
            out.append({'kind': 'lit', 't': raw, 'n': n0}); continue
        v = NR.num_of_token(raw)
        n = slot_count(raw)
        if not n:
            continue
        if v is not None:
            out.append({'kind': 'amb', 't': raw, 'v': v, 'n': n})
        else:
            out.append({'kind': 'syl', 't': raw, 'n': n})
    return out


def tokenize_cn(cn):
    """→ [{'kind':'hz','t':字} | {'kind':'dig','t':数字串}] （标点/字母跳过）"""
    out = []; i = 0
    while i < len(cn):
        ch = cn[i]
        if HAN.match(ch):
            out.append({'kind': 'hz', 't': ch}); i += 1
        elif ch.isdigit():
            j = i
            while j < len(cn) and (cn[j].isdigit() or cn[j] in '.,'): j += 1
            s = cn[i:j].rstrip('.,')
            if s:
                out.append({'kind': 'dig', 't': s})
            i = j
        elif re.match(r"[A-Za-z]", ch):
            j = i
            while j < len(cn) and re.match(r"[A-Za-z]", cn[j]): j += 1
            out.append({'kind': 'lat', 't': cn[i:j]})
            i = j
        else:
            i += 1
    return out


def align(cn, py, vocab_en, common):
    ctoks = tokenize_cn(cn)
    ptoks = tokenize_py(py)
    words = []
    i = 0; j = 0          # i: cn 位置, j: py 位置
    n = len(ctoks)
    while j < len(ptoks):
        p = ptoks[j]
        # ① 数字候选（amb）：仅当「原文当前位置正好是未匹配的阿拉伯数字串」且读音值相等时才按数字处理，
        #    否则一律当普通音节（避免 吧/是/一 等同音字被误判成 八/十/一）
        if p['kind'] == 'amb' and i < n and ctoks[i]['kind'] == 'dig':
            try:
                target = float(ctoks[i]['t'])
            except ValueError:
                target = None
            if target is not None:
                k = j; syls = []; hit = False
                while k < len(ptoks):
                    tk = ptoks[k]
                    s_tok = NR.strip_tone(tk['t'])
                    if tk['kind'] == 'amb':
                        s = NR.split_syls(s_tok)
                        if not s: break
                        syls += s
                    elif syls and s_tok in NR.JOIN_SYL:
                        # 百分之X（bǎi fēn zhī èr）/ X点X（qī diǎn wǔ）的连接音节
                        syls.append(s_tok)
                    else:
                        break
                    if NR.parse_expr(syls) == target:
                        words.append({'word': ctoks[i]['t'],
                                      'py': ' '.join(x['t'] for x in ptoks[j:k + 1]), 'en': ''})
                        i += 1; j = k + 1; hit = True
                        break
                    k += 1
                if hit:
                    continue
        if p['kind'] == 'lit':
            # ① 先试字面：原文当前位置是字母/数字且文本一致
            if i < n and ctoks[i]['kind'] in ('dig', 'lat') and \
                    ctoks[i]['t'].lower() == p['t'].lower():
                words.append({'word': ctoks[i]['t'], 'py': p['t'], 'en': ''}); i += 1; j += 1
                continue
            # ② 否则是轻声拼音（de/ma/ba…），按音节消耗汉字
            if p.get('n') and i < n and ctoks[i]['kind'] == 'hz':
                need = p['n']
                if i + need <= n and all(ctoks[i + x]['kind'] == 'hz' for x in range(need)):
                    word = ''.join(ctoks[i + x]['t'] for x in range(need))
                    en = vocab_en.get(word) or common.get(word) or ''
                    words.append({'word': word, 'py': NR.strip_tone(p['t']), 'en': en})
                    i += need; j += 1; continue
            j += 1  # 确实无对应（如孤立英文字母）
            continue
        # ② 普通音节（含 amb 未命中数字的情况）
        if i >= n:
            return None, {'type': 'cn_leftover', 'cn': cn, 'py': py, 'at': i}
        if ctoks[i]['kind'] != 'hz':
            return None, {'type': 'syl_hit_nonhanzi', 'cn': cn, 'py': py, 'at': i}
        need = p['n']
        if i + need > n:
            return None, {'type': 'syl_overflow', 'cn': cn, 'py': py, 'need': need, 'at': i}
        chars = []
        bad = False
        for x in range(need):
            if ctoks[i + x]['kind'] != 'hz':
                bad = True; break
            chars.append(ctoks[i + x]['t'])
        if bad:
            return None, {'type': 'syl_hit_digit', 'cn': cn, 'py': py, 'at': i}
        word = ''.join(chars)
        en = vocab_en.get(word) or common.get(word) or ''
        words.append({'word': word, 'py': NR.strip_tone(p['t']), 'en': en})
        i += need; j += 1
    # 允许末尾标点残留；若还有汉字未消耗则失败
    rest = [c for c in ctoks[i:] if c['kind'] == 'hz']
    if rest:
        return None, {'type': 'cn_leftover', 'cn': cn, 'py': py, 'rest': ''.join(c['t'] for c in rest)}
    return words, None


def fallback_align(cn, py, vocab_en, common):
    """拼音列与原文对不齐时（教材拼音漏/多音节、数字读法特殊等）的降级方案：
    jieba 分词 + pypinyin 生成拼音，保证句子仍能导入。"""
    import jieba
    words = []
    for w in jieba.lcut(cn, HMM=False):
        if not w.strip():
            continue
        if re.search(r'[\u4e00-\u9fff]', w):
            py_w = ''.join(lazy_pinyin(w, style=Style.TONE))
            en = vocab_en.get(w) or common.get(w) or ''
            words.append({'word': w, 'py': py_w, 'en': en})
        elif re.search(r'\d', w):
            words.append({'word': w, 'py': w, 'en': ''})
    return words


def parse_lessons():
    """→ [{num, title, texts:[{label, sentences:[{cn,py,en}]}]}]（一个 Scene 一个 text）"""
    rows = parse_xlsx(XLSX)
    lessons = []; cur_u = None; cur_t = None
    for r in rows:
        c0 = r[0] if r else ''
        if not c0: continue
        mu = re.match(r'^Unit\s*(\d+)\s*(.*)$', c0)
        if mu:
            cur_u = {'num': int(mu.group(1)), 'title': c0.strip(), 'texts': []}
            lessons.append(cur_u); cur_t = None; continue
        ms = re.match(r'^Scene\s*(\d+)\s*(.*)$', c0)
        if ms and cur_u is not None:
            title = ms.group(2).strip()
            zh = re.findall(r'[\u4e00-\u9fff]+', title)
            cur_t = {'label': ('场景 %s %s' % (ms.group(1), zh[0])) if zh else ('Scene ' + ms.group(1)),
                     'sentences': []}
            cur_u['texts'].append(cur_t); continue
        if c0.startswith('■'):
            continue
        if len(r) >= 4 and r[0].isdigit() and HAN.search(r[2]):
            if cur_t is None:
                cur_t = {'label': '场景', 'sentences': []}
                cur_u['texts'].append(cur_t)
            cur_t['sentences'].append({'cn': r[2], 'py': r[1], 'en': r[3]})
    return lessons


def main():
    common = load_common(); vocab_en = load_vocab_en()
    print(f"[info] COMMON={len(common)} 本书生词={len(vocab_en)}")
    lessons = parse_lessons()
    out = []; mism = []; fb = []; total = 0; dk = 0
    for les in lessons:
        texts = []
        for ti, tx in enumerate(les['texts'], 1):
            sents = []
            for si, s in enumerate(tx['sentences'], 1):
                words, err = align(s['cn'], s['py'], vocab_en, common)
                if err:
                    words = fallback_align(s['cn'], s['py'], vocab_en, common)
                    fb.append((s['cn'][:30], err['type']))
                if not words:
                    continue
                split = ' '.join(w['word'] for w in words)
                dct = {w['word']: f"{w['py']} / {w['en']}" for w in words if w['en']}
                sid = f"{SID_PREFIX}-l{les['num']}-t{ti}-s{si}"
                sents.append({'id': sid, 'cn': s['cn'], 'split': split, 'en': s['en'], 'dict': dct})
                total += 1; dk += len(dct)
            texts.append({'id': f"{SID_PREFIX}-l{les['num']}-t{ti}", 'label': tx['label'], 'sentences': sents})
        out.append({'id': f"lesson{les['num']}", 'title': les['title'],
                    'titleEn': f"Unit {les['num']}", 'texts': texts})
    print(f"[info] 句子 {total}  教材拼音对齐失败(已降级 jieba) {len(fb)}")
    for c, t in fb[:10]:
        print("   降级:", t, '|', c)
    for m in mism[:12]:
        print("   ", m['type'], '|', m.get('cn', '')[:30], '|', m.get('py_tok', ''), m.get('rest', ''))
    json.dump({'lessons': out}, open(os.path.join(APP, '_sentences_swcd.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print("[info] 已写 _sentences_swcd.json")
    if DRY_RUN:
        print("[dry-run] 未修改 content.ts；用 --emit 写入")
    else:
        emit(out)


def find_array_end(ts):
    """定位 textbooks 数组字面量闭合 ]（必须从 `= [` 起，且跳过字符串内括号）"""
    start = ts.index("export const textbooks")
    eq = ts.index("=", start)
    arr_open = ts.index("[", eq)
    depth = 0; in_str = False
    for j in range(arr_open, len(ts)):
        ch = ts[j]
        if in_str:
            if ch == '"' and ts[j - 1] != "\\": in_str = False
        else:
            if ch == '"': in_str = True
            elif ch == "[": depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0: return j
    raise RuntimeError("未找到 textbooks 数组闭合 ]")


def emit(out_lessons):
    obj = {
        "id": "business-chinese-handbook",
        "categoryId": "vocational",
        "title": "《想说就说·商务汉语口语完全手册》",
        "titleEn": "Business Chinese Speaking Handbook",
        "level": "中级",
        "lessons": out_lessons,
    }
    obj_str = json.dumps(obj, ensure_ascii=False, indent=2)
    obj_indented = "\n".join(("  " + line) if line.strip() else line
                             for line in obj_str.split("\n"))
    ts = open(CONTENT, encoding="utf-8").read()
    if 'business-chinese-handbook' in ts:
        print("[emit] 已存在，跳过"); return
    arr_end = find_array_end(ts)
    new_ts = ts[:arr_end] + ",\n" + obj_indented + ts[arr_end:]
    open(CONTENT, "w", encoding="utf-8").write(new_ts)
    print(f"[emit] 已插入 business-chinese-handbook（vocational，{len(out_lessons)} 单元）")


if __name__ == '__main__':
    main()
