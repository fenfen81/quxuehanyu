#!/usr/bin/env python3
"""
Parse the docx file for 汉语教程第一册（上）and generate content.ts
Includes pinyin-based word splitting, English translations, and dictionary entries.
"""

import json

# ============================================================
# Lesson data: each lesson has id, title, titleEn, texts
# Each text has id, label, sentences
# Each sentence has id, cn, split, en, dict
# 
# Pinyin from the docx is used to determine word boundaries (split)
# and dictionary entries (dict).
# English translations are provided manually.
# ============================================================

LESSONS = [
    # ===== 第一课 你好 =====
    {
        "id": "lesson1",
        "title": "第一课",
        "titleEn": "Lesson 1",
        "texts": [
            {
                "id": "lesson1-text1",
                "label": "课文：你好",
                "sentences": [
                    {
                        "id": "l1t1s1",
                        "cn": "你好！",
                        "split": "你好",
                        "en": "Hello!",
                        "dict": {"你好": "nǐ hǎo / hello"}
                    },
                    {
                        "id": "l1t1s2",
                        "cn": "你好！",
                        "split": "你好",
                        "en": "Hello!",
                        "dict": {"你好": "nǐ hǎo / hello"}
                    },
                ]
            }
        ]
    },
    # ===== 第二课 汉语不太难 =====
    {
        "id": "lesson2",
        "title": "第二课",
        "titleEn": "Lesson 2",
        "texts": [
            {
                "id": "lesson2-text1",
                "label": "课文：汉语不太难",
                "sentences": [
                    {
                        "id": "l2t1s1",
                        "cn": "你忙吗？",
                        "split": "你 忙 吗",
                        "en": "Are you busy?",
                        "dict": {"你": "nǐ / you", "忙": "máng / busy", "吗": "ma / (question particle)"}
                    },
                    {
                        "id": "l2t1s2",
                        "cn": "很忙。",
                        "split": "很 忙",
                        "en": "Very busy.",
                        "dict": {"很": "hěn / very", "忙": "máng / busy"}
                    },
                    {
                        "id": "l2t1s3",
                        "cn": "汉语难吗？",
                        "split": "汉语 难 吗",
                        "en": "Is Chinese difficult?",
                        "dict": {"汉语": "Hànyǔ / Chinese language", "难": "nán / difficult", "吗": "ma / (question particle)"}
                    },
                    {
                        "id": "l2t1s4",
                        "cn": "不太难。",
                        "split": "不 太 难",
                        "en": "Not too difficult.",
                        "dict": {"不": "bù / not", "太": "tài / too", "难": "nán / difficult"}
                    },
                ]
            }
        ]
    },
    # ===== 第三课 明天见 =====
    {
        "id": "lesson3",
        "title": "第三课",
        "titleEn": "Lesson 3",
        "texts": [
            {
                "id": "lesson3-text1",
                "label": "课文一：学汉语",
                "sentences": [
                    {"id": "l3t1s1", "cn": "你学英语吗？", "split": "你 学 英语 吗", "en": "Do you study English?", "dict": {"你": "nǐ / you", "学": "xué / study, learn", "英语": "Yīngyǔ / English", "吗": "ma / (question particle)"}},
                    {"id": "l3t1s2", "cn": "不，学汉语。", "split": "不 学 汉语", "en": "No, I study Chinese.", "dict": {"不": "bù / no, not", "学": "xué / study, learn", "汉语": "Hànyǔ / Chinese language"}},
                    {"id": "l3t1s3", "cn": "去北京吗？", "split": "去 北京 吗", "en": "Are you going to Beijing?", "dict": {"去": "qù / go", "北京": "Běijīng / Beijing", "吗": "ma / (question particle)"}},
                    {"id": "l3t1s4", "cn": "对。", "split": "对", "en": "Yes.", "dict": {"对": "duì / yes, right"}},
                ]
            },
            {
                "id": "lesson3-text2",
                "label": "课文二：明天见",
                "sentences": [
                    {"id": "l3t2s5", "cn": "你去邮局寄信吗？", "split": "你 去 邮局 寄信 吗", "en": "Are you going to the post office to mail a letter?", "dict": {"你": "nǐ / you", "去": "qù / go", "邮局": "yóujú / post office", "寄信": "jì xìn / mail a letter", "吗": "ma / (question particle)"}},
                    {"id": "l3t2s6", "cn": "不去。去银行取钱。", "split": "不 去 去 银行 取钱", "en": "No. I'm going to the bank to withdraw money.", "dict": {"不": "bù / no, not", "去": "qù / go", "银行": "yínháng / bank", "取钱": "qǔ qián / withdraw money"}},
                    {"id": "l3t2s7", "cn": "明天见！", "split": "明天 见", "en": "See you tomorrow!", "dict": {"明天": "míngtiān / tomorrow", "见": "jiàn / see, meet"}},
                    {"id": "l3t2s8", "cn": "明天见！", "split": "明天 见", "en": "See you tomorrow!", "dict": {"明天": "míngtiān / tomorrow", "见": "jiàn / see, meet"}},
                ]
            }
        ]
    },
    # ===== 第四课 你去哪儿 =====
    {
        "id": "lesson4",
        "title": "第四课",
        "titleEn": "Lesson 4",
        "texts": [
            {
                "id": "lesson4-text1",
                "label": "课文一：你去哪儿",
                "sentences": [
                    {"id": "l4t1s1", "cn": "今天星期几？", "split": "今天 星期 几", "en": "What day is it today?", "dict": {"今天": "jīntiān / today", "星期": "xīngqī / week, day of the week", "几": "jǐ / which, how many"}},
                    {"id": "l4t1s2", "cn": "今天星期二。", "split": "今天 星期二", "en": "Today is Tuesday.", "dict": {"今天": "jīntiān / today", "星期二": "xīngqī'èr / Tuesday"}},
                    {"id": "l4t1s3", "cn": "你去哪儿？", "split": "你 去 哪儿", "en": "Where are you going?", "dict": {"你": "nǐ / you", "去": "qù / go", "哪儿": "nǎr / where"}},
                    {"id": "l4t1s4", "cn": "我去天安门，你去不去？", "split": "我 去 天安门 你 去 不 去", "en": "I'm going to Tian'anmen, are you going?", "dict": {"我": "wǒ / I", "去": "qù / go", "天安门": "Tiān'ānmén / Tian'anmen", "不去": "bú qù / not go"}},
                    {"id": "l4t1s5", "cn": "不去，我回学校。", "split": "不 去 我 回 学校", "en": "No, I'm going back to school.", "dict": {"不": "bù / not", "去": "qù / go", "回": "huí / return", "学校": "xuéxiào / school"}},
                    {"id": "l4t1s6", "cn": "再见！", "split": "再见", "en": "Goodbye!", "dict": {"再见": "zàijiàn / goodbye"}},
                    {"id": "l4t1s7", "cn": "再见！", "split": "再见", "en": "Goodbye!", "dict": {"再见": "zàijiàn / goodbye"}},
                ]
            },
            {
                "id": "lesson4-text2",
                "label": "课文二：对不起",
                "sentences": [
                    {"id": "l4t2s8", "cn": "对不起！", "split": "对不起", "en": "Sorry!", "dict": {"对不起": "duìbuqǐ / sorry"}},
                    {"id": "l4t2s9", "cn": "没关系！", "split": "没关系", "en": "It doesn't matter!", "dict": {"没关系": "méi guānxi / it doesn't matter"}},
                ]
            }
        ]
    },
    # ===== 第五课 这是王老师 =====
    {
        "id": "lesson5",
        "title": "第五课",
        "titleEn": "Lesson 5",
        "texts": [
            {
                "id": "lesson5-text1",
                "label": "课文：这是王老师",
                "sentences": [
                    {"id": "l5t1s1", "cn": "这是王老师，这是我爸爸。", "split": "这 是 王老师 这 是 我 爸爸", "en": "This is Teacher Wang, this is my dad.", "dict": {"这": "zhè / this", "是": "shì / is", "王老师": "Wáng lǎoshī / Teacher Wang", "我": "wǒ / my, I", "爸爸": "bàba / dad"}},
                    {"id": "l5t1s2", "cn": "王老师，您好！", "split": "王老师 您 好", "en": "Teacher Wang, hello!", "dict": {"王老师": "Wáng lǎoshī / Teacher Wang", "您": "nín / you (honorific)", "好": "hǎo / good, hello"}},
                    {"id": "l5t1s3", "cn": "您好！请进！请坐！请喝茶！", "split": "您 好 请 进 请 坐 请 喝 茶", "en": "Hello! Please come in! Please sit down! Please have some tea!", "dict": {"您": "nín / you (honorific)", "好": "hǎo / good", "请": "qǐng / please", "进": "jìn / enter", "坐": "zuò / sit", "喝": "hē / drink", "茶": "chá / tea"}},
                    {"id": "l5t1s4", "cn": "谢谢！", "split": "谢谢", "en": "Thank you!", "dict": {"谢谢": "xièxie / thank you"}},
                    {"id": "l5t1s5", "cn": "不客气！", "split": "不 客气", "en": "You're welcome!", "dict": {"不": "bù / not", "客气": "kèqi / polite"}},
                    {"id": "l5t1s6", "cn": "工作忙吗？", "split": "工作 忙 吗", "en": "Are you busy with work?", "dict": {"工作": "gōngzuò / work", "忙": "máng / busy", "吗": "ma / (question particle)"}},
                    {"id": "l5t1s7", "cn": "不太忙。", "split": "不 太 忙", "en": "Not too busy.", "dict": {"不": "bù / not", "太": "tài / too", "忙": "máng / busy"}},
                    {"id": "l5t1s8", "cn": "身体好吗？", "split": "身体 好 吗", "en": "How is your health?", "dict": {"身体": "shēntǐ / health, body", "好": "hǎo / good", "吗": "ma / (question particle)"}},
                    {"id": "l5t1s9", "cn": "很好！", "split": "很 好", "en": "Very good!", "dict": {"很": "hěn / very", "好": "hǎo / good"}},
                ]
            }
        ]
    },
    # ===== 第六课 我学习汉语 =====
    {
        "id": "lesson6",
        "title": "第六课",
        "titleEn": "Lesson 6",
        "texts": [
            {
                "id": "lesson6-text1",
                "label": "课文一：我学习汉语",
                "sentences": [
                    {"id": "l6t1s1", "cn": "请问，你贵姓？", "split": "请问 你 贵姓", "en": "Excuse me, what is your surname?", "dict": {"请问": "qǐngwèn / excuse me, may I ask", "你": "nǐ / you", "贵姓": "guìxìng / your surname (honorific)"}},
                    {"id": "l6t1s2", "cn": "我姓张。", "split": "我 姓 张", "en": "My surname is Zhang.", "dict": {"我": "wǒ / I", "姓": "xìng / surname", "张": "Zhāng / Zhang"}},
                    {"id": "l6t1s3", "cn": "你叫什么名字？", "split": "你 叫 什么 名字", "en": "What is your name?", "dict": {"你": "nǐ / you", "叫": "jiào / be called", "什么": "shénme / what", "名字": "míngzi / name"}},
                    {"id": "l6t1s4", "cn": "我叫张东。", "split": "我 叫 张东", "en": "My name is Zhang Dong.", "dict": {"我": "wǒ / I", "叫": "jiào / be called", "张东": "Zhāng Dōng / Zhang Dong"}},
                    {"id": "l6t1s5", "cn": "你是哪国人？", "split": "你 是 哪国 人", "en": "What is your nationality?", "dict": {"你": "nǐ / you", "是": "shì / are", "哪国": "nǎ guó / which country", "人": "rén / person"}},
                    {"id": "l6t1s6", "cn": "我是中国人。你是哪国人？", "split": "我 是 中国人 你 是 哪国 人", "en": "I am Chinese. What is your nationality?", "dict": {"我": "wǒ / I", "是": "shì / am", "中国人": "Zhōngguó rén / Chinese person", "你": "nǐ / you", "哪国": "nǎ guó / which country", "人": "rén / person"}},
                    {"id": "l6t1s7", "cn": "我是美国人。", "split": "我 是 美国人", "en": "I am American.", "dict": {"我": "wǒ / I", "是": "shì / am", "美国人": "Měiguó rén / American"}},
                    {"id": "l6t1s8", "cn": "你学习什么？", "split": "你 学习 什么", "en": "What do you study?", "dict": {"你": "nǐ / you", "学习": "xuéxí / study", "什么": "shénme / what"}},
                    {"id": "l6t1s9", "cn": "我学习汉语。", "split": "我 学习 汉语", "en": "I study Chinese.", "dict": {"我": "wǒ / I", "学习": "xuéxí / study", "汉语": "Hànyǔ / Chinese language"}},
                    {"id": "l6t1s10", "cn": "汉语难吗？", "split": "汉语 难 吗", "en": "Is Chinese difficult?", "dict": {"汉语": "Hànyǔ / Chinese language", "难": "nán / difficult", "吗": "ma / (question particle)"}},
                    {"id": "l6t1s11", "cn": "汉字很难，发音不太难。", "split": "汉字 很 难 发音 不 太 难", "en": "Chinese characters are very difficult, pronunciation is not too difficult.", "dict": {"汉字": "Hànzì / Chinese characters", "很": "hěn / very", "难": "nán / difficult", "发音": "fāyīn / pronunciation", "不": "bù / not", "太": "tài / too"}},
                ]
            },
            {
                "id": "lesson6-text2",
                "label": "课文二：这是什么书",
                "sentences": [
                    {"id": "l6t2s12", "cn": "这是什么？", "split": "这 是 什么", "en": "What is this?", "dict": {"这": "zhè / this", "是": "shì / is", "什么": "shénme / what"}},
                    {"id": "l6t2s13", "cn": "这是书。", "split": "这 是 书", "en": "This is a book.", "dict": {"这": "zhè / this", "是": "shì / is", "书": "shū / book"}},
                    {"id": "l6t2s14", "cn": "这是什么书？", "split": "这 是 什么 书", "en": "What book is this?", "dict": {"这": "zhè / this", "是": "shì / is", "什么": "shénme / what", "书": "shū / book"}},
                    {"id": "l6t2s15", "cn": "这是中文书。", "split": "这 是 中文 书", "en": "This is a Chinese book.", "dict": {"这": "zhè / this", "是": "shì / is", "中文": "Zhōngwén / Chinese language", "书": "shū / book"}},
                    {"id": "l6t2s16", "cn": "这是谁的书？", "split": "这 是 谁 的 书", "en": "Whose book is this?", "dict": {"这": "zhè / this", "是": "shì / is", "谁": "shéi / who", "的": "de / (possessive particle)", "书": "shū / book"}},
                    {"id": "l6t2s17", "cn": "这是老师的书。", "split": "这 是 老师 的 书", "en": "This is the teacher's book.", "dict": {"这": "zhè / this", "是": "shì / is", "老师": "lǎoshī / teacher", "的": "de / (possessive particle)", "书": "shū / book"}},
                    {"id": "l6t2s18", "cn": "那是什么？", "split": "那 是 什么", "en": "What is that?", "dict": {"那": "nà / that", "是": "shì / is", "什么": "shénme / what"}},
                    {"id": "l6t2s19", "cn": "那是杂志。", "split": "那 是 杂志", "en": "That is a magazine.", "dict": {"那": "nà / that", "是": "shì / is", "杂志": "zázhì / magazine"}},
                    {"id": "l6t2s20", "cn": "那是什么杂志？", "split": "那 是 什么 杂志", "en": "What magazine is that?", "dict": {"那": "nà / that", "是": "shì / is", "什么": "shénme / what", "杂志": "zázhì / magazine"}},
                    {"id": "l6t2s21", "cn": "那是英文杂志。", "split": "那 是 英文 杂志", "en": "That is an English magazine.", "dict": {"那": "nà / that", "是": "shì / is", "英文": "Yīngwén / English language", "杂志": "zázhì / magazine"}},
                    {"id": "l6t2s22", "cn": "那是谁的杂志？", "split": "那 是 谁 的 杂志", "en": "Whose magazine is that?", "dict": {"那": "nà / that", "是": "shì / is", "谁": "shéi / who", "的": "de / (possessive particle)", "杂志": "zázhì / magazine"}},
                    {"id": "l6t2s23", "cn": "那是我朋友的杂志。", "split": "那 是 我 朋友 的 杂志", "en": "That is my friend's magazine.", "dict": {"那": "nà / that", "是": "shì / is", "我": "wǒ / my", "朋友": "péngyou / friend", "的": "de / (possessive particle)", "杂志": "zázhì / magazine"}},
                ]
            }
        ]
    },
    # ===== 第七课 你吃什么 =====
    {
        "id": "lesson7",
        "title": "第七课",
        "titleEn": "Lesson 7",
        "texts": [
            {
                "id": "lesson7-text1",
                "label": "课文：你吃什么",
                "sentences": [
                    {"id": "l7t1s1", "cn": "中午你去哪儿吃饭？", "split": "中午 你 去 哪儿 吃饭", "en": "Where do you go for lunch?", "dict": {"中午": "zhōngwǔ / noon", "你": "nǐ / you", "去": "qù / go", "哪儿": "nǎr / where", "吃饭": "chī fàn / eat, have a meal"}},
                    {"id": "l7t1s2", "cn": "我去食堂。", "split": "我 去 食堂", "en": "I go to the dining hall.", "dict": {"我": "wǒ / I", "去": "qù / go", "食堂": "shítáng / dining hall"}},
                    {"id": "l7t1s3", "cn": "你吃什么？", "split": "你 吃 什么", "en": "What do you eat?", "dict": {"你": "nǐ / you", "吃": "chī / eat", "什么": "shénme / what"}},
                    {"id": "l7t1s4", "cn": "我吃馒头。", "split": "我 吃 馒头", "en": "I eat steamed buns.", "dict": {"我": "wǒ / I", "吃": "chī / eat", "馒头": "mántou / steamed bun"}},
                    {"id": "l7t1s5", "cn": "你要几个？", "split": "你 要 几 个", "en": "How many do you want?", "dict": {"你": "nǐ / you", "要": "yào / want", "几": "jǐ / how many", "个": "gè / (measure word)"}},
                    {"id": "l7t1s6", "cn": "一个。你吃吗？", "split": "一个 你 吃 吗", "en": "One. Do you want to eat?", "dict": {"一个": "yí gè / one", "你": "nǐ / you", "吃": "chī / eat", "吗": "ma / (question particle)"}},
                    {"id": "l7t1s7", "cn": "不吃，我吃米饭。", "split": "不 吃 我 吃 米饭", "en": "No, I eat rice.", "dict": {"不": "bù / not", "吃": "chī / eat", "我": "wǒ / I", "米饭": "mǐfàn / rice"}},
                    {"id": "l7t1s8", "cn": "你喝什么？", "split": "你 喝 什么", "en": "What do you drink?", "dict": {"你": "nǐ / you", "喝": "hē / drink", "什么": "shénme / what"}},
                    {"id": "l7t1s9", "cn": "我要一碗鸡蛋汤。", "split": "我 要 一碗 鸡蛋汤", "en": "I want a bowl of egg soup.", "dict": {"我": "wǒ / I", "要": "yào / want", "一碗": "yì wǎn / a bowl of", "鸡蛋汤": "jīdàn tāng / egg soup"}},
                    {"id": "l7t1s10", "cn": "你喝吗？", "split": "你 喝 吗", "en": "Do you want to drink?", "dict": {"你": "nǐ / you", "喝": "hē / drink", "吗": "ma / (question particle)"}},
                    {"id": "l7t1s11", "cn": "不喝，我喝啤酒。", "split": "不 喝 我 喝 啤酒", "en": "No, I drink beer.", "dict": {"不": "bù / not", "喝": "hē / drink", "我": "wǒ / I", "啤酒": "píjiǔ / beer"}},
                    {"id": "l7t1s12", "cn": "这些是什么？", "split": "这些 是 什么", "en": "What are these?", "dict": {"这些": "zhèxiē / these", "是": "shì / are", "什么": "shénme / what"}},
                    {"id": "l7t1s13", "cn": "这是饺子，这是包子，那是面条。", "split": "这 是 饺子 这 是 包子 那 是 面条", "en": "These are dumplings, these are steamed buns, those are noodles.", "dict": {"这": "zhè / this", "是": "shì / is", "饺子": "jiǎozi / dumpling", "包子": "bāozi / steamed stuffed bun", "那": "nà / that", "面条": "miàntiáo / noodles"}},
                ]
            }
        ]
    },
    # ===== 第八课 苹果一斤多少钱 =====
    {
        "id": "lesson8",
        "title": "第八课",
        "titleEn": "Lesson 8",
        "texts": [
            {
                "id": "lesson8-text1",
                "label": "课文：苹果一斤多少钱",
                "sentences": [
                    {"id": "l8t1s1", "cn": "你买什么？", "split": "你 买 什么", "en": "What are you buying?", "dict": {"你": "nǐ / you", "买": "mǎi / buy", "什么": "shénme / what"}},
                    {"id": "l8t1s2", "cn": "我买水果。苹果一斤多少钱？", "split": "我 买 水果 苹果 一斤 多少 钱", "en": "I'm buying fruit. How much is one jin of apples?", "dict": {"我": "wǒ / I", "买": "mǎi / buy", "水果": "shuǐguǒ / fruit", "苹果": "píngguǒ / apple", "一斤": "yì jīn / one jin (half kilo)", "多少钱": "duōshao qián / how much money"}},
                    {"id": "l8t1s3", "cn": "三块。", "split": "三 块", "en": "Three yuan.", "dict": {"三": "sān / three", "块": "kuài / yuan (colloquial)"}},
                    {"id": "l8t1s4", "cn": "三块？太贵了。两块五吧。", "split": "三 块 太 贵 了 两 块 五 吧", "en": "Three yuan? Too expensive. How about two point five?", "dict": {"三": "sān / three", "块": "kuài / yuan", "太": "tài / too", "贵": "guì / expensive", "了": "le / (particle)", "两": "liǎng / two", "五": "wǔ / five", "吧": "ba / (suggestion particle)"}},
                    {"id": "l8t1s5", "cn": "你要几斤？", "split": "你 要 几 斤", "en": "How many jin do you want?", "dict": {"你": "nǐ / you", "要": "yào / want", "几": "jǐ / how many", "斤": "jīn / jin (half kilo)"}},
                    {"id": "l8t1s6", "cn": "我买五斤。", "split": "我 买 五 斤", "en": "I'll buy five jin.", "dict": {"我": "wǒ / I", "买": "mǎi / buy", "五": "wǔ / five", "斤": "jīn / jin"}},
                    {"id": "l8t1s7", "cn": "还要别的吗？", "split": "还 要 别的 吗", "en": "Do you want anything else?", "dict": {"还": "hái / still, also", "要": "yào / want", "别的": "biéde / other", "吗": "ma / (question particle)"}},
                    {"id": "l8t1s8", "cn": "橘子怎么卖？", "split": "橘子 怎么 卖", "en": "How much are the oranges?", "dict": {"橘子": "júzi / orange (fruit)", "怎么": "zěnme / how", "卖": "mài / sell"}},
                    {"id": "l8t1s9", "cn": "两块。", "split": "两 块", "en": "Two yuan.", "dict": {"两": "liǎng / two", "块": "kuài / yuan"}},
                    {"id": "l8t1s10", "cn": "要两斤。一共多少钱？", "split": "要 两斤 一共 多少 钱", "en": "I want two jin. How much altogether?", "dict": {"要": "yào / want", "两斤": "liǎng jīn / two jin", "一共": "yígòng / altogether", "多少钱": "duōshao qián / how much money"}},
                    {"id": "l8t1s11", "cn": "一共十六块五。你给十六块吧。", "split": "一共 十六块 五 你 给 十六块 吧", "en": "Altogether sixteen yuan fifty. You can give sixteen yuan.", "dict": {"一共": "yígòng / altogether", "十六块": "shíliù kuài / sixteen yuan", "五": "wǔ / fifty cents", "给": "gěi / give", "吧": "ba / (suggestion particle)"}},
                    {"id": "l8t1s12", "cn": "给你钱。", "split": "给 你 钱", "en": "Here's the money.", "dict": {"给": "gěi / give", "你": "nǐ / you", "钱": "qián / money"}},
                    {"id": "l8t1s13", "cn": "这是五十，找您三十四块。", "split": "这 是 五十 找 您 三十四 块", "en": "This is fifty, your change is thirty-four yuan.", "dict": {"这": "zhè / this", "是": "shì / is", "五十": "wǔshí / fifty", "找": "zhǎo / give change", "您": "nín / you (honorific)", "三十四": "sānshísì / thirty-four", "块": "kuài / yuan"}},
                ]
            }
        ]
    },
    # ===== 第九课 我换人民币 =====
    {
        "id": "lesson9",
        "title": "第九课",
        "titleEn": "Lesson 9",
        "texts": [
            {
                "id": "lesson9-text1",
                "label": "课文：我换人民币",
                "sentences": [
                    {"id": "l9t1s1", "cn": "下午我去图书馆，你去不去？", "split": "下午 我 去 图书馆 你 去 不 去", "en": "I'm going to the library this afternoon, are you going?", "dict": {"下午": "xiàwǔ / afternoon", "我": "wǒ / I", "去": "qù / go", "图书馆": "túshūguǎn / library", "你": "nǐ / you", "不去": "bú qù / not go"}},
                    {"id": "l9t1s2", "cn": "我不去。我要去银行换钱。", "split": "我 不 去 我 要 去 银行 换钱", "en": "I'm not going. I need to go to the bank to exchange money.", "dict": {"我": "wǒ / I", "不": "bù / not", "去": "qù / go", "要": "yào / want, need", "银行": "yínháng / bank", "换钱": "huàn qián / exchange money"}},
                    {"id": "l9t1s3", "cn": "小姐，我换钱。", "split": "小姐 我 换钱", "en": "Miss, I'd like to exchange money.", "dict": {"小姐": "xiǎojie / miss", "我": "wǒ / I", "换钱": "huàn qián / exchange money"}},
                    {"id": "l9t1s4", "cn": "您换什么钱？", "split": "您 换 什么 钱", "en": "What currency do you want to exchange?", "dict": {"您": "nín / you (honorific)", "换": "huàn / exchange", "什么": "shénme / what", "钱": "qián / money"}},
                    {"id": "l9t1s5", "cn": "我换人民币。", "split": "我 换 人民币", "en": "I want to exchange for RMB.", "dict": {"我": "wǒ / I", "换": "huàn / exchange", "人民币": "rénmínbì / RMB"}},
                    {"id": "l9t1s6", "cn": "换多少？", "split": "换 多少", "en": "How much do you want to exchange?", "dict": {"换": "huàn / exchange", "多少": "duōshao / how much"}},
                    {"id": "l9t1s7", "cn": "二百美元。", "split": "二百 美元", "en": "Two hundred US dollars.", "dict": {"二百": "èr bǎi / two hundred", "美元": "měiyuán / US dollar"}},
                    {"id": "l9t1s8", "cn": "请等一会儿……先生，给您钱。", "split": "请 等 一会儿 先生 给 您 钱", "en": "Please wait a moment... Sir, here is your money.", "dict": {"请": "qǐng / please", "等": "děng / wait", "一会儿": "yíhuìr / a while", "先生": "xiānsheng / sir", "给": "gěi / give", "您": "nín / you (honorific)", "钱": "qián / money"}},
                    {"id": "l9t1s9", "cn": "请数数。", "split": "请 数数", "en": "Please count it.", "dict": {"请": "qǐng / please", "数数": "shǔshu / count"}},
                    {"id": "l9t1s10", "cn": "对了。谢谢！", "split": "对了 谢谢", "en": "That's right. Thank you!", "dict": {"对了": "duì le / correct", "谢谢": "xièxie / thank you"}},
                    {"id": "l9t1s11", "cn": "不客气！", "split": "不 客气", "en": "You're welcome!", "dict": {"不": "bù / not", "客气": "kèqi / polite"}},
                ]
            }
        ]
    },
    # ===== 第十课 他住哪儿 =====
    {
        "id": "lesson10",
        "title": "第十课",
        "titleEn": "Lesson 10",
        "texts": [
            {
                "id": "lesson10-text1",
                "label": "课文：他住哪儿",
                "sentences": [
                    {"id": "l10t1s1", "cn": "请问，这是办公室吗？", "split": "请问 这 是 办公室 吗", "en": "Excuse me, is this the office?", "dict": {"请问": "qǐngwèn / excuse me", "这": "zhè / this", "是": "shì / is", "办公室": "bàngōngshì / office", "吗": "ma / (question particle)"}},
                    {"id": "l10t1s2", "cn": "是。你找谁？", "split": "是 你 找 谁", "en": "Yes. Who are you looking for?", "dict": {"是": "shì / yes", "你": "nǐ / you", "找": "zhǎo / look for", "谁": "shéi / who"}},
                    {"id": "l10t1s3", "cn": "王老师在吗？我是他的学生。", "split": "王老师 在 吗 我 是 他 的 学生", "en": "Is Teacher Wang here? I am his student.", "dict": {"王老师": "Wáng lǎoshī / Teacher Wang", "在": "zài / be present", "吗": "ma / (question particle)", "我": "wǒ / I", "是": "shì / am", "他": "tā / his", "的": "de / (possessive particle)", "学生": "xuésheng / student"}},
                    {"id": "l10t1s4", "cn": "他不在。他在家呢。", "split": "他 不 在 他 在 家 呢", "en": "He's not here. He is at home.", "dict": {"他": "tā / he", "不在": "bú zài / not be present", "在": "zài / be at", "家": "jiā / home", "呢": "ne / (modal particle)"}},
                    {"id": "l10t1s5", "cn": "他住哪儿？", "split": "他 住 哪儿", "en": "Where does he live?", "dict": {"他": "tā / he", "住": "zhù / live", "哪儿": "nǎr / where"}},
                    {"id": "l10t1s6", "cn": "他住十八楼一门，房间号是601。", "split": "他 住 十八楼 一门 房间号 是 601", "en": "He lives in Building 18, Door 1, Room 601.", "dict": {"他": "tā / he", "住": "zhù / live", "十八楼": "shíbā lóu / 18th building", "一门": "yī mén / Door 1", "房间号": "fángjiān hào / room number", "是": "shì / is"}},
                    {"id": "l10t1s7", "cn": "您知道他的电话号码吗？", "split": "您 知道 他 的 电话号码 吗", "en": "Do you know his phone number?", "dict": {"您": "nín / you (honorific)", "知道": "zhīdào / know", "他": "tā / his", "的": "de / (possessive particle)", "电话号码": "diànhuà hàomǎ / phone number", "吗": "ma / (question particle)"}},
                    {"id": "l10t1s8", "cn": "知道，62931074。", "split": "知道 62931074", "en": "Yes, 62931074.", "dict": {"知道": "zhīdào / know"}},
                    {"id": "l10t1s9", "cn": "他的手机号码是多少？", "split": "他 的 手机号码 是 多少", "en": "What is his mobile phone number?", "dict": {"他": "tā / his", "的": "de / (possessive particle)", "手机号码": "shǒujī hàomǎ / mobile phone number", "是": "shì / is", "多少": "duōshao / what, how much"}},
                    {"id": "l10t1s10", "cn": "不知道。", "split": "不 知道", "en": "I don't know.", "dict": {"不": "bù / not", "知道": "zhīdào / know"}},
                    {"id": "l10t1s11", "cn": "谢谢您。", "split": "谢谢 您", "en": "Thank you.", "dict": {"谢谢": "xièxie / thank you", "您": "nín / you (honorific)"}},
                    {"id": "l10t1s12", "cn": "不客气。", "split": "不 客气", "en": "You're welcome.", "dict": {"不": "bù / not", "客气": "kèqi / polite"}},
                ]
            }
        ]
    },
    # ===== 第十一课 我们都是留学生 =====
    {
        "id": "lesson11",
        "title": "第十一课",
        "titleEn": "Lesson 11",
        "texts": [
            {
                "id": "lesson11-text1",
                "label": "课文一：这位是王教授",
                "sentences": [
                    {"id": "l11t1s1", "cn": "我先介绍一下儿，这位是王教授。", "split": "我 先 介绍 一下儿 这 位 是 王教授", "en": "Let me introduce first, this is Professor Wang.", "dict": {"我": "wǒ / I", "先": "xiān / first", "介绍": "jièshào / introduce", "一下儿": "yíxiàr / a bit", "这": "zhè / this", "位": "wèi / (measure word for people)", "是": "shì / is", "王教授": "Wáng jiàoshòu / Professor Wang"}},
                    {"id": "l11t1s2", "cn": "这是马校长。", "split": "这 是 马校长", "en": "This is Principal Ma.", "dict": {"这": "zhè / this", "是": "shì / is", "马校长": "Mǎ xiàozhǎng / Principal Ma"}},
                    {"id": "l11t1s3", "cn": "欢迎您，王教授。", "split": "欢迎 您 王教授", "en": "Welcome, Professor Wang.", "dict": {"欢迎": "huānyíng / welcome", "您": "nín / you (honorific)", "王教授": "Wáng jiàoshòu / Professor Wang"}},
                    {"id": "l11t1s4", "cn": "谢谢！", "split": "谢谢", "en": "Thank you!", "dict": {"谢谢": "xièxie / thank you"}},
                ]
            },
            {
                "id": "lesson11-text2",
                "label": "课文二：我们都是留学生",
                "sentences": [
                    {"id": "l11t2s5", "cn": "你是留学生吗？", "split": "你 是 留学生 吗", "en": "Are you an international student?", "dict": {"你": "nǐ / you", "是": "shì / are", "留学生": "liúxuéshēng / international student", "吗": "ma / (question particle)"}},
                    {"id": "l11t2s6", "cn": "是。", "split": "是", "en": "Yes.", "dict": {"是": "shì / yes"}},
                    {"id": "l11t2s7", "cn": "罗兰也是留学生吗？", "split": "罗兰 也 是 留学生 吗", "en": "Is Luolan also an international student?", "dict": {"罗兰": "Luólán / Luolan", "也": "yě / also", "是": "shì / is", "留学生": "liúxuéshēng / international student", "吗": "ma / (question particle)"}},
                    {"id": "l11t2s8", "cn": "她也是留学生。我们都是留学生。", "split": "她 也 是 留学生 我们 都 是 留学生", "en": "She is also an international student. We are all international students.", "dict": {"她": "tā / she", "也": "yě / also", "是": "shì / is", "留学生": "liúxuéshēng / international student", "我们": "wǒmen / we", "都": "dōu / all"}},
                    {"id": "l11t2s9", "cn": "张东和田芳也都是留学生吗？", "split": "张东 和 田芳 也 都 是 留学生 吗", "en": "Are Zhang Dong and Tian Fang also international students?", "dict": {"张东": "Zhāng Dōng / Zhang Dong", "和": "hé / and", "田芳": "Tián Fāng / Tian Fang", "也": "yě / also", "都": "dōu / all", "是": "shì / are", "留学生": "liúxuéshēng / international student", "吗": "ma / (question particle)"}},
                    {"id": "l11t2s10", "cn": "不，他们俩不是留学生。他们都是中国学生。", "split": "不 他们俩 不 是 留学生 他们 都 是 中国学生", "en": "No, the two of them are not international students. They are both Chinese students.", "dict": {"不": "bù / no", "他们俩": "tāmen liǎ / the two of them", "不是": "bú shì / are not", "留学生": "liúxuéshēng / international student", "他们": "tāmen / they", "都": "dōu / both", "是": "shì / are", "中国学生": "Zhōngguó xuéshēng / Chinese student"}},
                ]
            },
            {
                "id": "lesson11-text3",
                "label": "课文三：你也是中国人吗",
                "sentences": [
                    {"id": "l11t3s11", "cn": "他是中国人吗？", "split": "他 是 中国人 吗", "en": "Is he Chinese?", "dict": {"他": "tā / he", "是": "shì / is", "中国人": "Zhōngguó rén / Chinese person", "吗": "ma / (question particle)"}},
                    {"id": "l11t3s12", "cn": "是。", "split": "是", "en": "Yes.", "dict": {"是": "shì / yes"}},
                    {"id": "l11t3s13", "cn": "你也是中国人吗？", "split": "你 也 是 中国人 吗", "en": "Are you also Chinese?", "dict": {"你": "nǐ / you", "也": "yě / also", "是": "shì / are", "中国人": "Zhōngguó rén / Chinese person", "吗": "ma / (question particle)"}},
                    {"id": "l11t3s14", "cn": "不是。我是韩国人。", "split": "不 是 我 是 韩国人", "en": "No. I am Korean.", "dict": {"不是": "bú shì / am not", "我": "wǒ / I", "是": "shì / am", "韩国人": "Hánguó rén / Korean"}},
                    {"id": "l11t3s15", "cn": "对不起。", "split": "对不起", "en": "Sorry.", "dict": {"对不起": "duìbuqǐ / sorry"}},
                    {"id": "l11t3s16", "cn": "没什么。", "split": "没什么", "en": "It's nothing.", "dict": {"没什么": "méi shénme / it's nothing"}},
                ]
            }
        ]
    },
    # ===== 第十二课 你在哪儿学习 =====
    {
        "id": "lesson12",
        "title": "第十二课",
        "titleEn": "Lesson 12",
        "texts": [
            {
                "id": "lesson12-text1",
                "label": "课文一：你在哪儿学习汉语",
                "sentences": [
                    {"id": "l12t1s1", "cn": "你在哪儿学习汉语？", "split": "你 在 哪儿 学习 汉语", "en": "Where do you study Chinese?", "dict": {"你": "nǐ / you", "在": "zài / at", "哪儿": "nǎr / where", "学习": "xuéxí / study", "汉语": "Hànyǔ / Chinese language"}},
                    {"id": "l12t1s2", "cn": "在北京语言大学。", "split": "在 北京语言大学", "en": "At Beijing Language and Culture University.", "dict": {"在": "zài / at", "北京语言大学": "Běijīng Yǔyán Dàxué / Beijing Language and Culture University"}},
                    {"id": "l12t1s3", "cn": "你们的老师怎么样？", "split": "你们 的 老师 怎么样", "en": "How are your teachers?", "dict": {"你们": "nǐmen / you (plural)", "的": "de / (possessive particle)", "老师": "lǎoshī / teacher", "怎么样": "zěnmeyàng / how about"}},
                    {"id": "l12t1s4", "cn": "很好！", "split": "很 好", "en": "Very good!", "dict": {"很": "hěn / very", "好": "hǎo / good"}},
                    {"id": "l12t1s5", "cn": "你觉得学习汉语难吗？", "split": "你 觉得 学习 汉语 难 吗", "en": "Do you think studying Chinese is difficult?", "dict": {"你": "nǐ / you", "觉得": "juéde / feel, think", "学习": "xuéxí / study", "汉语": "Hànyǔ / Chinese", "难": "nán / difficult", "吗": "ma / (question particle)"}},
                    {"id": "l12t1s6", "cn": "我觉得语法不太难。听和说也比较容易，但是读和写很难。", "split": "我 觉得 语法 不 太 难 听 和 说 也 比较 容易 但是 读 和 写 很 难", "en": "I think grammar is not too difficult. Listening and speaking are also relatively easy, but reading and writing are very difficult.", "dict": {"我": "wǒ / I", "觉得": "juéde / think", "语法": "yǔfǎ / grammar", "不太": "bú tài / not too", "难": "nán / difficult", "听": "tīng / listen", "和": "hé / and", "说": "shuō / speak", "也": "yě / also", "比较": "bǐjiào / relatively", "容易": "róngyi / easy", "但是": "dànshì / but", "读": "dú / read", "写": "xiě / write", "很": "hěn / very"}},
                ]
            },
            {
                "id": "lesson12-text2",
                "label": "课文二：你们的老师是谁",
                "sentences": [
                    {"id": "l12t2s7", "cn": "我给你们介绍一下儿，这位是新同学，是我的同屋。", "split": "我 给 你们 介绍 一下儿 这 位 是 新同学 是 我 的 同屋", "en": "Let me introduce you, this is the new classmate, is my roommate.", "dict": {"我": "wǒ / I", "给": "gěi / to", "你们": "nǐmen / you (plural)", "介绍": "jièshào / introduce", "一下儿": "yíxiàr / a bit", "这": "zhè / this", "位": "wèi / (measure word)", "是": "shì / is", "新同学": "xīn tóngxué / new classmate", "同屋": "tóngwū / roommate"}},
                    {"id": "l12t2s8", "cn": "你在哪个班学习？", "split": "你 在 哪个 班 学习", "en": "Which class do you study in?", "dict": {"你": "nǐ / you", "在": "zài / in", "哪个": "nǎ ge / which", "班": "bān / class", "学习": "xuéxí / study"}},
                    {"id": "l12t2s9", "cn": "在103班。", "split": "在 103 班", "en": "In Class 103.", "dict": {"在": "zài / in", "班": "bān / class"}},
                    {"id": "l12t2s10", "cn": "你们的老师是谁？", "split": "你们 的 老师 是 谁", "en": "Who is your teacher?", "dict": {"你们": "nǐmen / your", "的": "de / (possessive particle)", "老师": "lǎoshī / teacher", "是": "shì / is", "谁": "shéi / who"}},
                    {"id": "l12t2s11", "cn": "我们的老师是林老师。", "split": "我们 的 老师 是 林老师", "en": "Our teacher is Teacher Lin.", "dict": {"我们": "wǒmen / we", "的": "de / (possessive particle)", "老师": "lǎoshī / teacher", "是": "shì / is", "林老师": "Lín lǎoshī / Teacher Lin"}},
                ]
            }
        ]
    },
    # ===== 第十三课 这是不是中药 =====
    {
        "id": "lesson13",
        "title": "第十三课",
        "titleEn": "Lesson 13",
        "texts": [
            {
                "id": "lesson13-text1",
                "label": "课文一：这个黑箱子很重",
                "sentences": [
                    {"id": "l13t1s1", "cn": "你没有箱子吗？", "split": "你 没有 箱子 吗", "en": "Don't you have a suitcase?", "dict": {"你": "nǐ / you", "没有": "méiyǒu / don't have", "箱子": "xiāngzi / suitcase", "吗": "ma / (question particle)"}},
                    {"id": "l13t1s2", "cn": "有啊。我的在这儿呢。", "split": "有 啊 我 的 在 这儿 呢", "en": "Yes I do. Mine is right here.", "dict": {"有": "yǒu / have", "啊": "a / (particle)", "我": "wǒ / my", "的": "de / (possessive particle)", "在": "zài / at", "这儿": "zhèr / here", "呢": "ne / (modal particle)"}},
                    {"id": "l13t1s3", "cn": "我的很重，你的重不重？", "split": "我 的 很 重 你 的 重 不 重", "en": "Mine is very heavy, is yours heavy?", "dict": {"我": "wǒ / my", "的": "de / (possessive particle)", "很": "hěn / very", "重": "zhòng / heavy", "你": "nǐ / your", "不": "bù / not"}},
                    {"id": "l13t1s4", "cn": "这个黑的很重，那个红的比较轻。", "split": "这个 黑 的 很 重 那个 红 的 比较 轻", "en": "This black one is very heavy, that red one is relatively light.", "dict": {"这个": "zhè ge / this one", "黑": "hēi / black", "的": "de / (modifier particle)", "很": "hěn / very", "重": "zhòng / heavy", "那个": "nà ge / that one", "红": "hóng / red", "比较": "bǐjiào / relatively", "轻": "qīng / light"}},
                    {"id": "l13t1s5", "cn": "你的箱子很新，我的很旧。", "split": "你 的 箱子 很 新 我 的 很 旧", "en": "Your suitcase is very new, mine is very old.", "dict": {"你": "nǐ / your", "的": "de / (possessive particle)", "箱子": "xiāngzi / suitcase", "很": "hěn / very", "新": "xīn / new", "我": "wǒ / my", "旧": "jiù / old"}},
                    {"id": "l13t1s6", "cn": "那个新的是朋友的。这个旧的是我的。", "split": "那个 新 的 是 朋友 的 这个 旧 的 是 我 的", "en": "That new one belongs to a friend. This old one is mine.", "dict": {"那个": "nà ge / that one", "新": "xīn / new", "的": "de / (modifier particle)", "是": "shì / is", "朋友": "péngyou / friend", "这个": "zhè ge / this one", "旧": "jiù / old", "我": "wǒ / my"}},
                ]
            },
            {
                "id": "lesson13-text2",
                "label": "课文二：这是不是中药",
                "sentences": [
                    {"id": "l13t2s7", "cn": "先生，这些黑的是什么东西？", "split": "先生 这些 黑 的 是 什么 东西", "en": "Sir, what are these black things?", "dict": {"先生": "xiānsheng / sir", "这些": "zhèxiē / these", "黑": "hēi / black", "的": "de / (modifier particle)", "是": "shì / are", "什么": "shénme / what", "东西": "dōngxi / thing"}},
                    {"id": "l13t2s8", "cn": "这是一些药。", "split": "这 是 一些 药", "en": "These are some medicines.", "dict": {"这": "zhè / these", "是": "shì / are", "一些": "yìxiē / some", "药": "yào / medicine"}},
                    {"id": "l13t2s9", "cn": "什么药？", "split": "什么 药", "en": "What medicine?", "dict": {"什么": "shénme / what", "药": "yào / medicine"}},
                    {"id": "l13t2s10", "cn": "中药。", "split": "中药", "en": "Chinese medicine.", "dict": {"中药": "zhōngyào / Chinese medicine"}},
                    {"id": "l13t2s11", "cn": "这是不是药？", "split": "这 是 不 是 药", "en": "Is this medicine or not?", "dict": {"这": "zhè / this", "是不是": "shì bu shì / is or isn't", "药": "yào / medicine"}},
                    {"id": "l13t2s12", "cn": "这不是药，这是茶叶。", "split": "这 不 是 药 这 是 茶叶", "en": "This is not medicine, this is tea leaves.", "dict": {"这": "zhè / this", "不是": "bú shì / is not", "药": "yào / medicine", "茶叶": "cháyè / tea leaves"}},
                    {"id": "l13t2s13", "cn": "那个箱子里是什么？", "split": "那个 箱子 里 是 什么", "en": "What is in that suitcase?", "dict": {"那个": "nà ge / that", "箱子": "xiāngzi / suitcase", "里": "lǐ / inside", "是": "shì / is", "什么": "shénme / what"}},
                    {"id": "l13t2s14", "cn": "都是日用品。有两件衣服、一把雨伞和一瓶香水，还有一本书、一本词典、两张光盘和三支笔。", "split": "都 是 日用品 有 两件 衣服 一把 雨伞 和 一瓶 香水 还有 一本书 一本词典 两张 光盘 和 三支 笔", "en": "They are all daily necessities. There are two pieces of clothing, an umbrella and a bottle of perfume, also a book, a dictionary, two CDs and three pens.", "dict": {"都": "dōu / all", "是": "shì / are", "日用品": "rìyòngpǐn / daily necessities", "两件": "liǎng jiàn / two (pieces)", "衣服": "yīfu / clothes", "一把": "yì bǎ / a (for objects with handle)", "雨伞": "yǔsǎn / umbrella", "一瓶": "yì píng / a bottle of", "香水": "xiāngshuǐ / perfume", "还有": "hái yǒu / also have", "一本": "yì běn / a (for books)", "书": "shū / book", "词典": "cídiǎn / dictionary", "两张": "liǎng zhāng / two (for flat objects)", "光盘": "guāngpán / CD", "三支": "sān zhī / three (for pen-like objects)", "笔": "bǐ / pen"}},
                ]
            }
        ]
    },
    # ===== 第十四课 你的车是新的还是旧的 =====
    {
        "id": "lesson14",
        "title": "第十四课",
        "titleEn": "Lesson 14",
        "texts": [
            {
                "id": "lesson14-text1",
                "label": "课文一：您身体好吗",
                "sentences": [
                    {"id": "l14t1s1", "cn": "王老师，好久不见了。", "split": "王老师 好久 不 见 了", "en": "Teacher Wang, long time no see.", "dict": {"王老师": "Wáng lǎoshī / Teacher Wang", "好久": "hǎojiǔ / a long time", "不见": "bú jiàn / not see", "了": "le / (particle)"}},
                    {"id": "l14t1s2", "cn": "啊！关经理，欢迎，欢迎！", "split": "啊 关经理 欢迎 欢迎", "en": "Ah! Manager Guan, welcome, welcome!", "dict": {"啊": "à / ah", "关经理": "Guān jīnglǐ / Manager Guan", "欢迎": "huānyíng / welcome"}},
                    {"id": "l14t1s3", "cn": "您身体好吗？", "split": "您 身体 好 吗", "en": "How is your health?", "dict": {"您": "nín / you (honorific)", "身体": "shēntǐ / health, body", "好": "hǎo / good", "吗": "ma / (question particle)"}},
                    {"id": "l14t1s4", "cn": "很好。您身体怎么样？", "split": "很 好 您 身体 怎么样", "en": "Very good. How is your health?", "dict": {"很": "hěn / very", "好": "hǎo / good", "您": "nín / you (honorific)", "身体": "shēntǐ / health, body", "怎么样": "zěnmeyàng / how about"}},
                    {"id": "l14t1s5", "cn": "马马虎虎。", "split": "马马虎虎", "en": "So-so.", "dict": {"马马虎虎": "māmahūhū / so-so"}},
                    {"id": "l14t1s6", "cn": "最近工作忙不忙？", "split": "最近 工作 忙 不 忙", "en": "Have you been busy with work recently?", "dict": {"最近": "zuìjìn / recently", "工作": "gōngzuò / work", "忙": "máng / busy", "不": "bù / not"}},
                    {"id": "l14t1s7", "cn": "不太忙，您呢？", "split": "不 太 忙 您 呢", "en": "Not too busy, and you?", "dict": {"不": "bù / not", "太": "tài / too", "忙": "máng / busy", "您": "nín / you (honorific)", "呢": "ne / (modal particle)"}},
                    {"id": "l14t1s8", "cn": "刚开学，有点儿忙。喝点儿什么？茶还是咖啡？", "split": "刚 开学 有点儿 忙 喝 点儿 什么 茶 还是 咖啡", "en": "School just started, a bit busy. Would you like something to drink? Tea or coffee?", "dict": {"刚": "gāng / just", "开学": "kāi xué / start of school", "有点儿": "yǒudiǎnr / a bit", "忙": "máng / busy", "喝": "hē / drink", "点儿": "diǎnr / a little", "什么": "shénme / something", "茶": "chá / tea", "还是": "háishi / or", "咖啡": "kāfēi / coffee"}},
                    {"id": "l14t1s9", "cn": "喝杯茶吧！", "split": "喝 杯 茶 吧", "en": "Let's have a cup of tea!", "dict": {"喝": "hē / drink", "杯": "bēi / cup", "茶": "chá / tea", "吧": "ba / (suggestion particle)"}},
                ]
            },
            {
                "id": "lesson14-text2",
                "label": "课文二：你的自行车是新的还是旧的",
                "sentences": [
                    {"id": "l14t2s10", "cn": "我的车呢？", "split": "我 的 车 呢", "en": "Where is my bike?", "dict": {"我": "wǒ / my", "的": "de / (possessive particle)", "车": "chē / bike, car", "呢": "ne / (modal particle)"}},
                    {"id": "l14t2s11", "cn": "你的车是什么颜色的？", "split": "你 的 车 是 什么 颜色 的", "en": "What color is your bike?", "dict": {"你": "nǐ / your", "的": "de / (possessive particle)", "车": "chē / bike", "是": "shì / is", "什么": "shénme / what", "颜色": "yánsè / color", "的": "de / (modifier particle)"}},
                    {"id": "l14t2s12", "cn": "蓝的。", "split": "蓝 的", "en": "Blue.", "dict": {"蓝": "lán / blue", "的": "de / (modifier particle)"}},
                    {"id": "l14t2s13", "cn": "是新的还是旧的？", "split": "是 新 的 还是 旧 的", "en": "Is it new or old?", "dict": {"是": "shì / is", "新": "xīn / new", "的": "de / (modifier particle)", "还是": "háishi / or", "旧": "jiù / old"}},
                    {"id": "l14t2s14", "cn": "新的。", "split": "新 的", "en": "New.", "dict": {"新": "xīn / new", "的": "de / (modifier particle)"}},
                    {"id": "l14t2s15", "cn": "那辆蓝的是不是你的？", "split": "那 辆 蓝 的 是 不 是 你 的", "en": "Is that blue one yours?", "dict": {"那": "nà / that", "辆": "liàng / (measure word for vehicles)", "蓝": "lán / blue", "的": "de / (modifier particle)", "是不是": "shì bu shì / is or isn't", "你": "nǐ / your"}},
                    {"id": "l14t2s16", "cn": "哪辆？", "split": "哪 辆", "en": "Which one?", "dict": {"哪": "nǎ / which", "辆": "liàng / (measure word)"}},
                    {"id": "l14t2s17", "cn": "那辆。", "split": "那 辆", "en": "That one.", "dict": {"那": "nà / that", "辆": "liàng / (measure word)"}},
                    {"id": "l14t2s18", "cn": "不是。……啊，我的车在那儿呢。", "split": "不 是 啊 我 的 车 在 那儿 呢", "en": "No... Ah, my bike is over there.", "dict": {"不是": "bú shì / is not", "啊": "à / ah", "我": "wǒ / my", "的": "de / (possessive particle)", "车": "chē / bike", "在": "zài / at", "那儿": "nàr / there", "呢": "ne / (modal particle)"}},
                ]
            }
        ]
    },
    # ===== 第十五课 你们公司有多少职员 =====
    {
        "id": "lesson15",
        "title": "第十五课",
        "titleEn": "Lesson 15",
        "texts": [
            {
                "id": "lesson15-text1",
                "label": "课文一：你家有几口人",
                "sentences": [
                    {"id": "l15t1s1", "cn": "你家有几口人？", "split": "你 家 有 几口 人", "en": "How many people are in your family?", "dict": {"你": "nǐ / your", "家": "jiā / family", "有": "yǒu / have", "几口": "jǐ kǒu / how many (for family members)", "人": "rén / people"}},
                    {"id": "l15t1s2", "cn": "我家有五口人，爸爸、妈妈、哥哥、姐姐和我。", "split": "我 家 有 五口人 爸爸 妈妈 哥哥 姐姐 和 我", "en": "There are five people in my family: dad, mom, older brother, older sister and me.", "dict": {"我": "wǒ / my", "家": "jiā / family", "有": "yǒu / have", "五口": "wǔ kǒu / five (family members)", "爸爸": "bàba / dad", "妈妈": "māma / mom", "哥哥": "gēge / older brother", "姐姐": "jiějie / older sister", "和": "hé / and", "我": "wǒ / me"}},
                    {"id": "l15t1s3", "cn": "你有没有全家的照片？", "split": "你 有没有 全家 的 照片", "en": "Do you have a family photo?", "dict": {"你": "nǐ / you", "有没有": "yǒu méiyǒu / do you have", "全家": "quán jiā / whole family", "的": "de / (possessive particle)", "照片": "zhàopiàn / photo"}},
                    {"id": "l15t1s4", "cn": "有一张。你看，这是我们全家的照片。你有哥哥姐姐吗？", "split": "有 一张 你 看 这 是 我们 全家 的 照片 你 有 哥哥 姐姐 吗", "en": "I have one. Look, this is our family photo. Do you have brothers and sisters?", "dict": {"有": "yǒu / have", "一张": "yì zhāng / one (for flat objects)", "你": "nǐ / you", "看": "kàn / look", "这": "zhè / this", "是": "shì / is", "我们": "wǒmen / our", "全家": "quán jiā / whole family", "的": "de / (possessive particle)", "照片": "zhàopiàn / photo", "哥哥": "gēge / older brother", "姐姐": "jiějie / older sister", "吗": "ma / (question particle)"}},
                    {"id": "l15t1s5", "cn": "我没有哥哥，也没有姐姐，只有两个弟弟。", "split": "我 没有 哥哥 也 没有 姐姐 只 有 两个 弟弟", "en": "I don't have older brothers or older sisters, I only have two younger brothers.", "dict": {"我": "wǒ / I", "没有": "méiyǒu / don't have", "哥哥": "gēge / older brother", "也": "yě / also", "姐姐": "jiějie / older sister", "只": "zhǐ / only", "有": "yǒu / have", "两个": "liǎng gè / two", "弟弟": "dìdi / younger brother"}},
                    {"id": "l15t1s6", "cn": "你爸爸、妈妈做什么工作？", "split": "你 爸爸 妈妈 做 什么 工作", "en": "What do your father and mother do?", "dict": {"你": "nǐ / your", "爸爸": "bàba / dad", "妈妈": "māma / mom", "做": "zuò / do", "什么": "shénme / what", "工作": "gōngzuò / work"}},
                    {"id": "l15t1s7", "cn": "我妈妈是大夫，在医院工作，爸爸是一家公司的经理。", "split": "我 妈妈 是 大夫 在 医院 工作 爸爸 是 一家 公司 的 经理", "en": "My mom is a doctor, works at a hospital, dad is a manager of a company.", "dict": {"我": "wǒ / my", "妈妈": "māma / mom", "是": "shì / is", "大夫": "dàifu / doctor", "在": "zài / at", "医院": "yīyuàn / hospital", "工作": "gōngzuò / work", "爸爸": "bàba / dad", "一家": "yì jiā / a", "公司": "gōngsī / company", "的": "de / (possessive particle)", "经理": "jīnglǐ / manager"}},
                    {"id": "l15t1s8", "cn": "我妈妈在商店工作，爸爸是律师。", "split": "我 妈妈 在 商店 工作 爸爸 是 律师", "en": "My mom works in a store, dad is a lawyer.", "dict": {"我": "wǒ / my", "妈妈": "māma / mom", "在": "zài / at", "商店": "shāngdiàn / store", "工作": "gōngzuò / work", "爸爸": "bàba / dad", "是": "shì / is", "律师": "lǜshī / lawyer"}},
                ]
            },
            {
                "id": "lesson15-text2",
                "label": "课文二：你们公司有多少职员",
                "sentences": [
                    {"id": "l15t2s9", "cn": "你们是一家什么公司？", "split": "你们 是 一家 什么 公司", "en": "What kind of company are you?", "dict": {"你们": "nǐmen / you (plural)", "是": "shì / are", "一家": "yì jiā / a", "什么": "shénme / what kind", "公司": "gōngsī / company"}},
                    {"id": "l15t2s10", "cn": "是一家外贸公司。", "split": "是 一家 外贸公司", "en": "It's a foreign trade company.", "dict": {"是": "shì / is", "一家": "yì jiā / a", "外贸公司": "wàimào gōngsī / foreign trade company"}},
                    {"id": "l15t2s11", "cn": "是一家大公司吗？", "split": "是 一家 大 公司 吗", "en": "Is it a big company?", "dict": {"是": "shì / is", "一家": "yì jiā / a", "大": "dà / big", "公司": "gōngsī / company", "吗": "ma / (question particle)"}},
                    {"id": "l15t2s12", "cn": "不大，是一家比较小的公司。", "split": "不 大 是 一家 比较 小 的 公司", "en": "Not big, it's a relatively small company.", "dict": {"不": "bù / not", "大": "dà / big", "是": "shì / is", "一家": "yì jiā / a", "比较": "bǐjiào / relatively", "小": "xiǎo / small", "的": "de / (modifier particle)", "公司": "gōngsī / company"}},
                    {"id": "l15t2s13", "cn": "有多少职员？", "split": "有 多少 职员", "en": "How many employees are there?", "dict": {"有": "yǒu / have", "多少": "duōshao / how many", "职员": "zhíyuán / employee"}},
                    {"id": "l15t2s14", "cn": "大概有一百多个职员。", "split": "大概 有 一百多 个 职员", "en": "About one hundred plus employees.", "dict": {"大概": "dàgài / roughly, about", "有": "yǒu / have", "一百多": "yì bǎi duō / one hundred plus", "个": "gè / (measure word)", "职员": "zhíyuán / employee"}},
                    {"id": "l15t2s15", "cn": "都是中国职员吗？", "split": "都 是 中国 职员 吗", "en": "Are they all Chinese employees?", "dict": {"都": "dōu / all", "是": "shì / are", "中国": "Zhōngguó / Chinese", "职员": "zhíyuán / employee", "吗": "ma / (question particle)"}},
                    {"id": "l15t2s16", "cn": "不都是中国职员，也有外国职员。", "split": "不 都 是 中国 职员 也 有 外国 职员", "en": "Not all are Chinese employees, there are also foreign employees.", "dict": {"不": "bù / not", "都": "dōu / all", "是": "shì / are", "中国": "Zhōngguó / Chinese", "职员": "zhíyuán / employee", "也": "yě / also", "有": "yǒu / have", "外国": "wàiguó / foreign", "职员": "zhíyuán / employee"}},
                ]
            }
        ]
    },
]

def generate_content_ts():
    """Generate the full content.ts file"""
    lines = []
    lines.append("import type { Category, CategorySlug, Textbook } from '@/types'")
    lines.append('')
    lines.append('export const categories: Category[] = [')
    lines.append("  { slug: 'comprehensive', name: '综合汉语', nameEn: 'Comprehensive Chinese', description: '系统学习听、说、读、写，全面提高汉语水平', icon: '📚' },")
    lines.append("  { slug: 'hsk', name: 'HSK 考试类', nameEn: 'HSK Exam Prep', description: '针对 HSK 各等级考试进行专项训练', icon: '📝' },")
    lines.append("  { slug: 'oral', name: '口语类', nameEn: 'Oral Chinese', description: '聚焦日常对话与口语表达，开口说汉语', icon: '🗣️' },")
    lines.append("  { slug: 'vocational', name: '中文+职业技能', nameEn: 'Chinese + Vocational Skills', description: '结合职业场景学习专业汉语', icon: '💼' }")
    lines.append(']')
    lines.append('')
    lines.append('export const textbooks: Textbook[] = [')
    lines.append("    {")
    lines.append("      id: 'hanyu-jiaocheng-1a',")
    lines.append("      categoryId: 'comprehensive',")
    lines.append("      title: \"《汉语教程》第一册（上）\",")
    lines.append("      titleEn: \"Chinese Course Vol.1A\",")
    lines.append("      level: '初级',")
    lines.append("      lessons: [")

    for lesson in LESSONS:
        lines.append("        {")
        lines.append(f"          id: '{lesson['id']}',")
        lines.append(f"          title: '{lesson['title']}',")
        lines.append(f"          titleEn: '{lesson['titleEn']}',")
        lines.append("          texts: [")

        for text in lesson['texts']:
            lines.append("            {")
            lines.append(f"              id: '{text['id']}',")
            # Escape the label for TypeScript
            label = text['label'].replace("'", "\\'")
            lines.append(f"              label: \"{label}\",")
            lines.append("              sentences: [")

            for s in text['sentences']:
                lines.append("                {")
                lines.append(f"                  id: '{s['id']}',")
                # Escape cn for double quotes
                cn = s['cn'].replace('\\', '\\\\').replace('"', '\\"')
                lines.append(f'                  cn: "{cn}",')
                split = s['split'].replace('\\', '\\\\').replace('"', '\\"')
                lines.append(f'                  split: "{split}",')
                en = s['en'].replace('\\', '\\\\').replace('"', '\\"')
                lines.append(f'                  en: "{en}",')
                lines.append("                  dict: {")
                for k, v in s['dict'].items():
                    k_esc = k.replace('\\', '\\\\').replace('"', '\\"')
                    v_esc = v.replace('\\', '\\\\').replace('"', '\\"')
                    lines.append(f'                                "{k_esc}": "{v_esc}",')
                lines.append("                              },")
                lines.append("                },")

            lines.append("              ],")
            lines.append("            },")

        lines.append("          ],")
        lines.append("        },")

    lines.append("      ],")
    lines.append("    },")
    # Keep the existing 下册 placeholder
    lines.append("    {")
    lines.append("      id: 'hanyu-jiaocheng-1b',")
    lines.append("      categoryId: 'comprehensive',")
    lines.append("      title: \"《汉语教程》第一册（下）\",")
    lines.append("      titleEn: \"Chinese Course Vol.1B\",")
    lines.append("      level: '初级',")
    lines.append("      lessons: []")
    lines.append("    }")
    lines.append(']')
    lines.append('')
    lines.append('export function getTextbookById(id: string): Textbook | undefined {')
    lines.append('  return textbooks.find((t) => t.id === id)')
    lines.append('}')
    lines.append('')
    lines.append('export function getTextbooksByCategory(categoryId: CategorySlug): Textbook[] {')
    lines.append('  return textbooks.filter((t) => t.categoryId === categoryId)')
    lines.append('}')
    lines.append('')

    return '\n'.join(lines)


def get_all_sentence_ids():
    """Get all sentence IDs for TTS generation"""
    ids = []
    for lesson in LESSONS:
        for text in lesson['texts']:
            for s in text['sentences']:
                ids.append(s['id'])
    return ids


def get_all_sentence_cns():
    """Get all sentence Chinese text for TTS generation"""
    result = {}
    for lesson in LESSONS:
        for text in lesson['texts']:
            for s in text['sentences']:
                result[s['id']] = s['cn']
    return result


def get_all_unique_chars():
    """Get all unique Chinese characters for hanzi data download"""
    import re
    chars = set()
    for lesson in LESSONS:
        for text in lesson['texts']:
            for s in text['sentences']:
                for c in s['cn']:
                    if re.match(r'[\u4e00-\u9fff]', c):
                        chars.add(c)
    return chars


if __name__ == '__main__':
    import sys
    sys.stdout.reconfigure(encoding='utf-8')

    # Generate content.ts
    ts_code = generate_content_ts()
    with open('src/data/content.ts', 'w', encoding='utf-8') as f:
        f.write(ts_code)
    print("Generated content.ts")

    # Print stats
    total_sentences = 0
    for lesson in LESSONS:
        for text in lesson['texts']:
            total_sentences += len(text['sentences'])
    print(f"Total lessons: {len(LESSONS)}")
    print(f"Total texts: {sum(len(l['texts']) for l in LESSONS)}")
    print(f"Total sentences: {total_sentences}")
    print(f"Unique characters: {len(get_all_unique_chars())}")

    # Print sentence IDs for audio generation
    ids = get_all_sentence_ids()
    print(f"\nSentence IDs ({len(ids)}):")
    for id in ids:
        print(f"  {id}")
