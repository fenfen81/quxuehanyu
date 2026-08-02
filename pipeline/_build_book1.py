#!/usr/bin/env python
# -*- coding: utf-8 -*-
# 生成《汉语教程》第二册（上）第一课 的 book.json（AI 补英文翻译 + 生词例句）
import os, re, json

OUT = r"C:/ProgramData/WorkBuddy/chromium-env/1365jvd/WorkBuddy/2026-06-16-11-47-45/app/pipeline/books/hanyu-jiaocheng-2a/book.json"

def norm(s):
    s = s.strip()
    # 去 CJK 间空格；英文左右空格保留
    s = re.sub(r'(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])', '', s)
    s = re.sub(r'(?<=[\u4e00-\u9fff])\s+(?=[\u3000-\u303f\uff00-\uffef])', '', s)
    s = re.sub(r'(?<=[\u3000-\u303f\uff00-\uffef])\s+(?=[\u4e00-\u9fff])', '', s)
    return s

# 课文（一）田芳去哪儿了
t1 = [
 ("喂，是田芳吗？", "Hello, is this Tian Fang?"),
 ("田芳不在。", "Tian Fang isn't here."),
 ("是张东吧？", "It's Zhang Dong, right?"),
 ("阿姨，您好！", "Aunt, hello!"),
 ("田芳去哪儿了？", "Where has Tian Fang gone?"),
 ("她四点多就去同学家了。", "She went to a classmate's home a little after four."),
 ("她的一个中学同学要出国，她去看看她。", "One of her middle-school classmates is going abroad, so she went to see her off."),
 ("她什么时候能回来？", "When will she be back?"),
 ("她没说，你打她的手机吧。", "She didn't say; just call her mobile phone."),
 ("我打了，可是她关机了。", "I called, but her phone was off."),
 ("是吗？", "Is that so?"),
 ("你过一会儿再打吧。", "Call her again in a little while."),
]
# 课文（二）他又来电话了
t2 = [
 ("阿姨，田芳回来了没有？", "Aunt, has Tian Fang come back yet?"),
 ("还没有呢。", "Not yet."),
 ("妈，我回来了。", "Mom, I'm back."),
 ("饿了吧？", "You must be hungry, right?"),
 ("快吃饭吧！", "Hurry up and eat!"),
 ("啊，对了，张东给你打电话了，没有？", "Oh, right—Zhang Dong called you, didn't he?"),
 ("没有啊。", "No, he didn't."),
 ("他来电话找你，说打你的手机，你关机了。", "He called looking for you; he said he called your mobile, but it was off."),
 ("啊！对了，我忘开机了。", "Ah! Right, I forgot to turn on my phone."),
 ("快！电话又响了，你去接吧。", "Quick! The phone is ringing again—go answer it."),
 ("喂，张东，下午你给我打电话了吧？", "Hello, Zhang Dong, you called me this afternoon, right?"),
 ("打了，你怎么关机了？", "I did. Why was your phone off?"),
 ("对不起，我忘开机了。", "Sorry, I forgot to turn on my phone."),
 ("下午你做什么了？", "What did you do this afternoon?"),
 ("我去踢足球了。", "I went to play football."),
 ("今天我们跟留学生代表队比赛了。", "Today we played a match against the international students' team."),
 ("你们队又输了吧？", "Your team lost again, didn't you?"),
 ("没有。", "No."),
 ("这次我们赢了。", "This time we won."),
 ("几比几？", "What was the score?"),
 ("二比一。", "Two to one."),
 ("祝贺你们！", "Congratulations to you all!"),
 ("哎，你有什么事儿吗？", "Hey, do you have something to ask?"),
 ("我想问问你，你不是要上托福班吗？", "I want to ask you—weren't you going to take the TOEFL class?"),
 ("报名了没有？", "Have you signed up?"),
 ("已经报了。", "I've already signed up."),
 ("你是不是也想考托福？", "Do you also want to take the TOEFL test?"),
 ("是。", "Yes."),
 ("我想明天去报名，你陪我一起去，好吗？", "I want to go sign up tomorrow; will you come with me?"),
 ("好的。", "OK / All right."),
]

# 生词（hanzi, pos, english, exampleCn, exampleEn）— 例句贴合课文内容/本课语法点
vocab = [
 ("喂","叹","hello","喂，是田芳吗？","Hello, is this Tian Fang?"),
 ("阿姨","名","aunt (polite term for an older woman)","阿姨，您好！","Hello, aunt!"),
 ("了","助","a particle indicating a completed action or a new situation","我打了，可是她关机了。","I called, but her phone was off."),
 ("中学","名","middle school","她的一个中学同学要出国。","One of her middle-school classmates is going abroad."),
 ("出国","动","to go abroad","她的一个中学同学要出国。","One of her middle-school classmates is going abroad."),
 ("打（电话）","动","to make (a phone call)","你打她的手机吧。","Just call her mobile phone."),
 ("关机","动","to turn off one's mobile phone","我打了，可是她关机了。","I called, but her phone was off."),
 ("饿","形","hungry","饿了吧？快吃饭吧！","You must be hungry. Hurry up and eat!"),
 ("对了","短","by the way; and","啊，对了，张东给你打电话了。","Oh, by the way, Zhang Dong called you."),
 ("忘","动","to forget","我忘开机了。","I forgot to turn on my phone."),
 ("开机","动","to turn on one's mobile phone","我忘开机了。","I forgot to turn on my phone."),
 ("又","副","again (for a repeated past action)","电话又响了。","The phone rang again."),
 ("响","动","to ring; to make a sound","电话又响了。","The phone rang again."),
 ("接","动","to answer (a call); to receive","电话又响了，你去接吧。","The phone is ringing again—go answer it."),
 ("踢","动","to kick; to play (football)","我去踢足球了。","I went to play football."),
 ("比赛","动、名","match; game; to compete","今天我们跟留学生代表队比赛了。","Today we played a match against the international students' team."),
 ("队","名","team","你们队又输了吧？","Your team lost again, didn't you?"),
 ("输","动","to lose (a game)","你们队又输了吧？","Your team lost again, didn't you?"),
 ("赢","动","to win (a game)","这次我们赢了。","This time we won."),
 ("比","动","to (used in scores, e.g. 'two to one')","二比一。","Two to one."),
 ("祝贺","动","to congratulate","祝贺你们！","Congratulations to you all!"),
 ("哎","叹","(interjection used to attract attention or as a reminder)","哎，你有什么事儿吗？","Hey, do you have something to ask?"),
 ("上","动","to attend (a class, program, etc.)","你不是要上托福班吗？","Weren't you going to take the TOEFL class?"),
 ("托福","名","TOEFL","你是不是也想考托福？","Do you also want to take the TOEFL test?"),
 ("已经","副","already","已经报了。","I've already signed up."),
 ("考","动","to take a test","你是不是也想考托福？","Do you also want to take the TOEFL test?"),
 ("陪","动","to accompany","你陪我一起去，好吗？","Will you come with me?"),
]

book = {
  "textbookId": "hanyu-jiaocheng-2a",
  "bookCode": "hj2a",
  "title": "《汉语教程》第二册（上）",
  "titleEn": "Chinese Course Vol.2A",
  "categoryId": "comprehensive",
  "level": "初级",
  "lessons": [
    {
      "lessonNum": 1,
      "lessonTitle": "第一课 田芳去哪儿了",
      "lessonTitleEn": "Lesson 1 Where has Tian Fang gone",
      "texts": [
        {"label": "课文（一）田芳去哪儿了", "sentences": [{"cn": norm(c), "en": e} for c, e in t1]},
        {"label": "课文（二）他又来电话了", "sentences": [{"cn": norm(c), "en": e} for c, e in t2]},
      ],
      "words": [
        {"hanzi": h, "pos": p, "english": e, "exampleCn": norm(ec), "exampleEn": ee}
        for h, p, e, ec, ee in vocab
      ],
    }
  ]
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(book, f, ensure_ascii=False, indent=2)
print("已写出 book.json：", OUT)
print("课文（一）句数:", len(t1), " 课文（二）句数:", len(t2), " 生词数:", len(vocab))
