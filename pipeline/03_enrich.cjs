#!/usr/bin/env node
// 03_enrich.cjs — 机械补全
// 读 AI 产出的 book.json，自动生成拼音/分词/id/dict(拼音+英文)/例句拼音，
// 输出 book.enriched.json。仅做可机械推导的字段；英文释义、词性、例句英文由 AI 提供。
const fs = require('fs')
const path = require('path')
const { pinyin, segment } = require('pinyin-pro')

const BOOKS = path.join(__dirname, 'books')
const bookId = process.argv[2]
if (!bookId) { console.error('用法: node 03_enrich.cjs <bookId>'); process.exit(1) }

const bookPath = path.join(BOOKS, bookId, 'book.json')
if (!fs.existsSync(bookPath)) { console.error('找不到', bookPath, '\n请先完成读图步骤生成 book.json'); process.exit(1) }

const book = JSON.parse(fs.readFileSync(bookPath, 'utf-8'))
const code = (book.bookCode || bookId.replace(/[^a-z0-9]/gi, '').toLowerCase())

const isPunct = (t) => /^[\s\p{P}\p{S}]+$/u.test(t)
function segWords(cn) {
  try {
    const segs = segment(cn || '')
    // pinyin-pro v3 segment 返回 [{origin,result}, ...]
    const toks = (segs.length && typeof segs[0] === 'object') ? segs.map((s) => s.origin) : segs
    return toks.filter((t) => typeof t === 'string' && !isPunct(t))
  } catch { return String(cn || '').split('') }
}
function py(s) {
  try {
    const arr = pinyin(s || '', { toneType: 'symbol', type: 'array' })
    return arr.filter((t) => !/^[\p{P}\p{S}\s]+$/u.test(t)).join(' ')
  } catch { return String(s || '') }
}
// 贪心最长匹配分词：优先把生字表/常用词表里的多字词条保持为一整词（如 田芳、哪儿、同学），
// 避免 pinyin-pro segment 把名字/词拆成单字。dictKeys 需按长度降序传入。
function tokenize(cn, dictKeys) {
  const toks = []
  const s = String(cn || '')
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (isPunct(ch)) { i++; continue }
    let matched = ''
    for (const k of dictKeys) {
      if (k && s.startsWith(k, i)) { matched = k; break }
    }
    if (matched) { toks.push(matched); i += matched.length }
    else { toks.push(ch); i++ }
  }
  return toks
}
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }

// 英文释义查找：先精确匹配，再子串回退（处理 AI 给的 dict 键与分词粒度不一致）
function lookupEnglish(word, aiDict) {
  if (!aiDict || typeof aiDict !== 'object') return ''
  if (aiDict[word] != null && aiDict[word] !== '') return aiDict[word]
  for (const k of Object.keys(aiDict)) {
    if (!k) continue
    if (word.includes(k) || k.includes(word)) return aiDict[k]
  }
  return ''
}

// 常用词英义表（兜底）：当 book.json 的句子未显式提供 dict，且不在本课生词表时，
// 用此表自动补全逐词英文释义，避免逐个句子手写 dict。可按需扩充。
const COMMON = {
  "喂": "hello", "是": "to be (am/is/are)", "田芳": "Tian Fang (name)", "吗": "(question particle)",
  "张东": "Zhang Dong (name)", "吧": "(particle, soft suggestion/guess)", "阿姨": "aunt (polite term for older woman)",
  "您": "you (polite)", "好": "good; well; OK", "去": "to go", "哪儿": "where", "她": "she; her",
  "四点多": "a little past four o'clock", "就": "just; simply", "同学": "classmate", "家": "home; family",
  "了": "(particle: completed action / new situation)", "的": "(possessive/modifier particle)",
  "一个": "one (a)", "中学": "middle school", "要": "to want; to be going to", "出国": "to go abroad",
  "看": "to look; to see; to visit", "什么": "what", "时候": "time; moment", "能": "can; to be able to",
  "回来": "to come back; to return", "没": "not (past)", "说": "to say; to speak", "你": "you",
  "打": "to hit; to make (a phone call)", "手机": "mobile phone", "我": "I; me", "可是": "but; however",
  "关机": "to turn off (one's phone)", "是吗": "is that so?", "过一会儿": "after a while; in a bit",
  "再": "again (future)", "啊": "(interjection)", "对了": "by the way", "忘": "to forget",
  "开机": "to turn on (one's phone)", "快": "quick; hurry", "电话": "telephone; phone",
  "又": "again (repeated past action)", "响": "to ring; to make a sound", "接": "to answer (a call); to receive",
  "下午": "afternoon", "给": "to give; for", "打电话": "to make a phone call", "怎么": "how; why",
  "对不起": "sorry", "做": "to do; to make", "踢足球": "to play football", "今天": "today",
  "我们": "we; us", "跟": "with; and", "留学生": "international student", "代表队": "representative team",
  "比赛": "match; game; to compete", "你们": "you (plural)", "队": "team", "输": "to lose (a game)",
  "没有": "not have; haven't", "这次": "this time", "赢": "to win (a game)", "几": "how many; several",
  "比": "to (in a score); than", "二": "two", "一": "one", "祝贺": "to congratulate", "有": "to have",
  "事儿": "thing; matter", "想": "to want; to think", "上": "to attend (a class)", "托福班": "TOEFL class",
  "报名": "to register; to sign up", "已经": "already", "报": "to report; to register",
  "是不是": "whether or not; yes or no", "也": "also; too", "考": "to take a test", "明天": "tomorrow",
  "陪": "to accompany", "一起": "together", "好的": "OK; all right", "饿": "hungry", "吃饭": "to eat (a meal)",
  "没有呢": "not yet", "妈": "mom", "回来": "to return",
  "不": "not", "在": "to be at; (at)", "张": "Zhang (surname)", "东": "east",
  "个": "(measure word)", "回": "to return; to reply", "来": "to come",
  "还": "still; yet", "他": "he; him", "找": "to look for", "问": "to ask",
  // 常用复合词（防止 tokenize 拆成单字）：时间/程度/连接/心理/状态/生活类
  "昨天": "yesterday", "今天": "today", "明天": "tomorrow", "啤酒": "beer",
  "一些": "some; a few", "因为": "because", "所以": "therefore", "但是": "but; however",
  "已经": "already", "一起": "together", "可以": "can; may; OK", "感到": "feel",
  "常常": "often; frequently", "寂寞": "lonely", "难过": "sad; upset", "厉害": "serious; severe",
  "牛肉": "beef", "鱼肉": "fish (meat)", "鸡肉": "chicken", "猪肉": "pork",
  "面包": "bread", "牛奶": "milk", "咖啡": "coffee", "果汁": "fruit juice",
  "可乐": "Coke", "瓶子": "bottle", "杯子": "cup", "筷子": "chopsticks",
  "身体": "body; health", "生病": "fall ill", "医院": "hospital", "医生": "doctor",
  "病人": "patient", "护士": "nurse", "药品": "medicine", "药店": "pharmacy",
  "检查": "examination; to examine", "化验": "laboratory test", "结果": "result",
  "出来": "come out", "进去": "go in", "回来": "come back", "起来": "get up",
  "看见": "see; spot", "听到": "hear", "遇到": "meet; encounter", "找到": "find",
  "想到": "think of", "觉得": "feel; think", "知道": "know", "认识": "know; recognize",
  "了解": "understand", "相信": "believe", "希望": "hope; wish", "喜欢": "like; love",
  "担心": "worry about", "关心": "care about", "注意": "pay attention to",
  "开始": "start; begin", "结束": "end; finish", "继续": "continue", "准备": "prepare",
  "帮助": "help", "告诉": "tell", "回答": "answer", "让": "let; allow",
  "请": "please; invite", "叫": "call; name", "使": "make; cause", "把": "BA marker",
  "被": "passive marker", "从": "from", "向": "towards", "往": "towards",
  "对": "to; towards; correct", "给": "give; for", "为": "for", "跟": "with",
  "和": "and; with", "比": "than; to compare", "或者": "or", "还": "still; also",
  "也": "also; too", "都": "all; both", "太": "too; excessively", "更": "more",
  "最": "most", "真": "really; truly", "正": "just; right", "刚": "just now",
  "才": "only then; just", "又": "again", "再": "again (future)", "先": "first",
  "只": "only", "很": "very", "挺": "quite; rather", "较": "relatively",
  "会": "can; will", "能": "can; able to", "要": "want; need; will", "想": "want; think",
  "应该": "should", "愿意": "willing to", "需要": "need", "可能": "possible; maybe"
}

let totalSent = 0, totalWords = 0
for (let li = 0; li < book.lessons.length; li++) {
  const lesson = book.lessons[li]
  const lessonNum = lesson.lessonNum || (li + 1)
  lesson.lessonId = lesson.lessonId || `lesson${lessonNum}`

  // 本课生词英义表：句子 dict 的兜底来源之一（优先于 COMMON）
  const vocabEn = {}
  for (const w of (lesson.words || [])) { if (w && w.hanzi) vocabEn[w.hanzi] = w.english || '' }

  if (lesson.texts) {
    const segDict = Object.keys(vocabEn).concat(Object.keys(COMMON)).sort((a, b) => b.length - a.length)
    for (let ti = 0; ti < lesson.texts.length; ti++) {
      const text = lesson.texts[ti]
      const textId = `${code}-l${lessonNum}-t${ti + 1}`
      text.id = text.id || textId
      for (let si = 0; si < (text.sentences || []).length; si++) {
        const s = text.sentences[si]
        s.id = `${code}-l${lessonNum}-t${ti + 1}-s${si + 1}`
        // 优先用 AI 显式提供的 dict 键作为分词；否则用贪心最长匹配（生字表+常用词表）做逐词分词。
        const aiDict = s.dict || {}
        const words = Object.keys(aiDict).length ? Object.keys(aiDict) : tokenize(s.cn, segDict)
        s.split = words.join(' ')
        const dict = {}
        for (const w of words) {
          const en = aiDict[w] != null && aiDict[w] !== '' ? aiDict[w] : (vocabEn[w] || COMMON[w] || '')
          const p = py(w)
          dict[w] = en ? `${p} / ${en}` : p
        }
        s.dict = dict
        totalSent++
      }
    }
  }

  if (lesson.words) {
    for (let wi = 0; wi < lesson.words.length; wi++) {
      const w = lesson.words[wi]
      w.id = `${code}-l${lessonNum}-w${wi + 1}`
      w.pinyin = w.pinyin || py(w.hanzi)
      w.examplePinyin = cap(py(w.exampleCn))
      totalWords++
    }
  }
}

const outPath = path.join(BOOKS, bookId, 'book.enriched.json')
fs.writeFileSync(outPath, JSON.stringify(book, null, 2), 'utf-8')
console.log(`[enrich] 完成：${totalSent} 句 / ${totalWords} 词 → ${outPath}`)
