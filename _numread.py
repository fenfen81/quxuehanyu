#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""阿拉伯数字 ↔ 中文读音 互转工具（供课文拼音对齐用）。
场景：原文含 "2015年" / "3000元" / "5月20日" / "TT-110"，
      拼音列写的是汉字读音 "èr líng yī wǔ nián" / "sānqiān yuán" / "wǔ yuè èrshí rì"。
做法：把连续的"数字读音 token"合并解析成数值，与原文中按顺序出现的阿拉伯数字串匹配。
"""
import re

_ACC = str.maketrans("āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ", "aaaaeeeeiiiioooouuuuüüüü")

DIGITS = {
    'ling': 0, 'yao': 1, 'yi': 1, 'er': 2, 'san': 3, 'si': 4,
    'wu': 5, 'liu': 6, 'qi': 7, 'ba': 8, 'jiu': 9,
}
UNITS = {'shi': 10, 'bai': 100, 'qian': 1000, 'wan': 10000}
# 音节切分用的已知音节（按长度从长到短贪心）
SYLS = ['ling', 'yao', 'shi', 'bai', 'qian', 'wan', 'yi', 'er', 'san', 'si',
        'wu', 'liu', 'qi', 'ba', 'jiu']


def strip_tone(tok: str) -> str:
    return re.sub(r"[^a-zü']", "", tok.lower().replace('’', "'").translate(_ACC))


def split_syls(s: str):
    """把去声调的连续数字读音串切成音节列表，如 'erlingyiwu' -> ['er','ling','yi','wu']"""
    out = []
    i = 0
    while i < len(s):
        for cand in ('ling', 'shi', 'bai', 'qian', 'wan', 'yao',
                     'yi', 'er', 'san', 'si', 'wu', 'liu', 'qi', 'ba', 'jiu'):
            if s.startswith(cand, i) and len(cand) >= 2:
                out.append(cand); i += len(cand); break
        else:
            for cand in ('yi', 'wu'):  # 单字母音节
                if s.startswith(cand, i):
                    out.append(cand); i += len(cand); break
            else:
                return None
    return out


def parse_num_syls(syls) -> int:
    """中文数字音节序列 → 数值。含单位走单位算法；纯数字序列按位拼接。"""
    if not syls:
        return None
    if any(s in UNITS for s in syls):
        total = 0; cur = 0; seen_digit = False
        for s in syls:
            if s in DIGITS:
                cur = DIGITS[s]; seen_digit = True
            elif s in UNITS:
                u = UNITS[s]
                if not seen_digit:
                    cur = 1
                total += cur * u
                cur = 0; seen_digit = False
            else:
                return None
        return total + cur
    # 纯数字序列：按位拼接
    ds = []
    for s in syls:
        if s in DIGITS:
            ds.append(str(DIGITS[s]))
        else:
            return None
    return int(''.join(ds))


def is_num_token(tok: str) -> bool:
    s = strip_tone(tok)
    if not s:
        return False
    syls = split_syls(s)
    if not syls:
        return False
    return all(x in DIGITS or x in UNITS for x in syls)


def num_of_token(tok: str):
    s = strip_tone(tok)
    syls = split_syls(s)
    return parse_num_syls(syls) if syls else None


JOIN_SYL = {'fen', 'zhi', 'dian'}  # 百分之X / X点X 中的连接音节（非数字读音）


def parse_expr(syls):
    """数字音节序列（可含 'fen'/'zhi'/'dian' 连接音节）→ 数值。
    - bǎi fēn zhī èr（百分之二）→ 2
    - qī diǎn wǔ（七点五）→ 7.5
    - sānqiān（三千）→ 3000；èr líng yī wǔ（二零一五）→ 2015
    """
    if not syls:
        return None
    if 'fen' in syls or 'zhi' in syls:
        # 百分之 N：取"之"后面的部分（可能是复合数 bāshí=80），否则取最后一个数字音节
        if 'zhi' in syls:
            tail = syls[syls.index('zhi') + 1:]
            if tail:
                return parse_num_syls(tail)
        ds = [s for s in syls if s in DIGITS]
        return DIGITS[ds[-1]] if ds else None
    if 'dian' in syls:
        idx = syls.index('dian')
        left = parse_num_syls([s for s in syls[:idx]])
        right = ''.join(str(DIGITS[s]) for s in syls[idx + 1:] if s in DIGITS)
        try:
            return float(f"{left}.{right}")
        except (ValueError, TypeError):
            return None
    return parse_num_syls(syls)


if __name__ == '__main__':
    tests = [('èr', 2), ('líng', 0), ('yī', 1), ('wǔ', 5), ('èrshí', 20),
             ('sānshíyī', 31), ('sānqiān', 3000), ('wǔbǎi', 500), ('yāo', 1),
             ('bā', 8), ('sān', 3), ('shí', 10), ('èrshíwǔ', 25)]
    ok = 0
    for t, exp in tests:
        got = num_of_token(t)
        flag = 'OK ' if got == exp else 'FAIL'
        if got == exp: ok += 1
        print(f"  {flag} {t:10s} -> {got} (期望 {exp})")
    print(f"单元测试 {ok}/{len(tests)} 通过")
    print("表达式：百分之二=", parse_expr(['bai', 'fen', 'zhi', 'er']),
          " 七点五=", parse_expr(['qi', 'dian', 'wu']),
          " 二零一五=", parse_expr(['er', 'ling', 'yi', 'wu']),
          " 三千=", parse_expr(['san', 'qian']))
