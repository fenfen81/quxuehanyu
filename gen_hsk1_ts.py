# -*- coding: utf-8 -*-
"""
Parse HSK标准教程1 docx → generate TypeScript for content.ts
"""
import zipfile, re, json
from xml.etree import ElementTree as ET

docx_path = r'D:/我的外国学生的汉语教学相关资料/我制作趣学汉语网站所需的一些教材材料/《HSK标准教程》第一册的课文原文-带拼音.docx'

with zipfile.ZipFile(docx_path, 'r') as z:
    xml = z.read('word/document.xml').decode('utf-8')

root = ET.fromstring(xml)
paragraphs = []
for p in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
    texts = []
    for r in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r'):
        for t in r.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
            if t.text:
                texts.append(t.text)
    line = ''.join(texts).strip()
    if line:
        paragraphs.append(line)

# ── Pinyin character detection (lowercase + uppercase tone marks) ──
TONE_LOWER = 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹ'
TONE_UPPER = 'ĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǛǗǙǕÜŃŇǸ'
TONE_CHARS = set(TONE_LOWER + TONE_UPPER)
def is_pinyin_char(c):
    return (c.isascii() and c.isalpha()) or c in TONE_CHARS

def split_pinyin_chinese(text):
    """Split interleaved pinyin-Chinese text into (pinyin, chinese) pairs."""
    pairs = []
    i = 0
    n = len(text)
    while i < n:
        while i < n and text[i] == ' ':
            i += 1
        if i >= n:
            break
        if is_pinyin_char(text[i]):
            py_start = i
            while i < n and (is_pinyin_char(text[i]) or text[i] in " ,.?!:'"):
                i += 1
            pinyin = text[py_start:i].strip()
            while i < n and text[i] == ' ':
                i += 1
            cn_start = i
            while i < n and not is_pinyin_char(text[i]):
                i += 1
            chinese = text[cn_start:i].strip()
            if pinyin and chinese:
                pairs.append((pinyin, chinese))
        else:
            i += 1
    return pairs

# ── Parse lesson structure ──
lessons = []
current_lesson = None
current_scene = None

for para in paragraphs:
    # Lesson header: 第X课 (may have scene info appended)
    lesson_match = re.match(r'^第(.+?)课\s+(.+)$', para)
    if lesson_match and not para.startswith('场景'):
        # Check if scene info is appended to lesson title
        full_title = para
        scene_in_title = re.search(r'(场景\s*\d+.*)', para)
        if scene_in_title:
            lesson_title = para[:scene_in_title.start()].strip()
            scene_text = scene_in_title.group(1)
        else:
            lesson_title = para
            scene_text = None

        current_lesson = {'title': lesson_title, 'scenes': []}
        lessons.append(current_lesson)

        # If scene info was in the title, create that scene
        if scene_text:
            current_scene = {'label': scene_text, 'sentences': []}
            current_lesson['scenes'].append(current_scene)
        else:
            current_scene = None
        continue

    # Scene header: 场景X
    scene_match = re.match(r'^场景\s*\d', para)
    if scene_match:
        current_scene = {'label': para, 'sentences': []}
        current_lesson['scenes'].append(current_scene)
        continue

    # Content line
    if current_scene:
        pairs = split_pinyin_chinese(para)
        for pinyin, chinese in pairs:
            current_scene['sentences'].append({'pinyin': pinyin, 'cn': chinese})

# ── Verify ──
total = 0
for i, lesson in enumerate(lessons):
    lt = sum(len(s['sentences']) for s in lesson['scenes'])
    total += lt
    print(f"L{i+1}: {lesson['title']} - {len(lesson['scenes'])} scenes, {lt} sentences")
print(f"Total: {len(lessons)} lessons, {total} sentences")

# ── HSK1 Word Dictionary (hanzi → pinyin, english) ──
WD = {
    "你好": ("nǐ hǎo", "hello"),
    "您": ("nín", "you (polite)"),
    "你们": ("nǐmen", "you (plural)"),
    "好": ("hǎo", "good"),
    "对不起": ("duìbuqǐ", "sorry"),
    "没关系": ("méi guānxi", "it doesn't matter"),
    "谢谢": ("xièxie", "thank you"),
    "不": ("bù", "not"),
    "谢": ("xiè", "thank"),
    "客气": ("kèqi", "polite"),
    "再见": ("zàijiàn", "goodbye"),
    "你": ("nǐ", "you"),
    "叫": ("jiào", "to be called"),
    "什么": ("shénme", "what"),
    "名字": ("míngzi", "name"),
    "我": ("wǒ", "I"),
    "是": ("shì", "to be"),
    "老师": ("lǎoshī", "teacher"),
    "吗": ("ma", "(question particle)"),
    "学生": ("xuésheng", "student"),
    "中国": ("Zhōngguó", "China"),
    "人": ("rén", "person"),
    "美国": ("Měiguó", "America"),
    "她": ("tā", "she"),
    "谁": ("shéi", "who"),
    "的": ("de", "(possessive particle)"),
    "汉语": ("Hànyǔ", "Chinese language"),
    "哪": ("nǎ", "which"),
    "国": ("guó", "country"),
    "呢": ("ne", "(question particle)"),
    "他": ("tā", "he"),
    "同学": ("tóngxué", "classmate"),
    "朋友": ("péngyou", "friend"),
    "家": ("jiā", "family/home"),
    "有": ("yǒu", "to have"),
    "几": ("jǐ", "how many"),
    "口": ("kǒu", "(measure word for people)"),
    "三": ("sān", "three"),
    "女儿": ("nǚ'ér", "daughter"),
    "岁": ("suì", "years old"),
    "了": ("le", "(completion particle)"),
    "今年": ("jīnnián", "this year"),
    "四": ("sì", "four"),
    "多大": ("duō dà", "how old"),
    "五十": ("wǔshí", "fifty"),
    "二十": ("èrshí", "twenty"),
    "会": ("huì", "can/to know how to"),
    "说": ("shuō", "to speak"),
    "妈妈": ("māma", "mom"),
    "菜": ("cài", "dish/food"),
    "好吃": ("hǎo chī", "delicious"),
    "很": ("hěn", "very"),
    "做": ("zuò", "to make/do"),
    "写": ("xiě", "to write"),
    "汉字": ("Hànzì", "Chinese character"),
    "这个": ("zhège", "this"),
    "字": ("zì", "character"),
    "怎么": ("zěnme", "how"),
    "读": ("dú", "to read"),
    "请问": ("qǐngwèn", "excuse me"),
    "今天": ("jīntiān", "today"),
    "号": ("hào", "date/number"),
    "月": ("yuè", "month"),
    "一": ("yī", "one"),
    "星期": ("xīngqī", "week"),
    "九": ("jiǔ", "nine"),
    "昨天": ("zuótiān", "yesterday"),
    "八": ("bā", "eight"),
    "二": ("èr", "two"),
    "明天": ("míngtiān", "tomorrow"),
    "六": ("liù", "six"),
    "去": ("qù", "to go"),
    "学校": ("xuéxiào", "school"),
    "看书": ("kàn shū", "to read a book"),
    "想": ("xiǎng", "to want to"),
    "喝": ("hē", "to drink"),
    "茶": ("chá", "tea"),
    "吃": ("chī", "to eat"),
    "米饭": ("mǐfàn", "rice"),
    "下午": ("xiàwǔ", "afternoon"),
    "商店": ("shāngdiàn", "store"),
    "买": ("mǎi", "to buy"),
    "一个": ("yí gè", "one (measure)"),
    "杯子": ("bēizi", "cup"),
    "多少": ("duōshao", "how much"),
    "钱": ("qián", "money"),
    "块": ("kuài", "(money unit)"),
    "那个": ("nàge", "that"),
    "小猫": ("xiǎo māo", "kitten"),
    "在": ("zài", "at/in"),
    "哪儿": ("nǎr", "where"),
    "那儿": ("nàr", "there"),
    "小狗": ("xiǎo gǒu", "puppy"),
    "椅子": ("yǐzi", "chair"),
    "下面": ("xiàmian", "under"),
    "工作": ("gōngzuò", "to work"),
    "儿子": ("érzi", "son"),
    "医院": ("yīyuàn", "hospital"),
    "医生": ("yīshēng", "doctor"),
    "爸爸": ("bàba", "dad"),
    "家": ("jiā", "home"),
    "桌子": ("zhuōzi", "table/desk"),
    "上": ("shàng", "on"),
    "电脑": ("diànnǎo", "computer"),
    "和": ("hé", "and"),
    "书": ("shū", "book"),
    "里": ("lǐ", "in/inside"),
    "前面": ("qiánmiàn", "front"),
    "那": ("nà", "that"),
    "后面": ("hòumiàn", "behind"),
    "王方": ("Wáng Fāng", "Wang Fang (name)"),
    "谢朋": ("Xiè Péng", "Xie Peng (name)"),
    "这儿": ("zhèr", "here"),
    "没有": ("méiyǒu", "to not have"),
    "能": ("néng", "can/to be able to"),
    "坐": ("zuò", "to sit"),
    "请": ("qǐng", "please"),
    "现在": ("xiànzài", "now"),
    "点": ("diǎn", "o'clock"),
    "分": ("fēn", "minute"),
    "十": ("shí", "ten"),
    "中午": ("zhōngwǔ", "noon"),
    "吃饭": ("chī fàn", "to eat a meal"),
    "十二": ("shí'èr", "twelve"),
    "什么时候": ("shénme shíhou", "when"),
    "回": ("huí", "to return"),
    "五": ("wǔ", "five"),
    "我们": ("wǒmen", "we"),
    "看电影": ("kàn diànyǐng", "to watch a movie"),
    "北京": ("Běijīng", "Beijing"),
    "住": ("zhù", "to stay/live"),
    "天": ("tiān", "day"),
    "前": ("qián", "before"),
    "天气": ("tiānqì", "weather"),
    "怎么样": ("zěnmeyàng", "how about it"),
    "太": ("tài", "too"),
    "热": ("rè", "hot"),
    "冷": ("lěng", "cold"),
    "会": ("huì", "will/to be able to"),
    "下雨": ("xià yǔ", "to rain"),
    "小姐": ("xiǎojie", "Miss"),
    "来": ("lái", "to come"),
    "身体": ("shēntǐ", "body/health"),
    "爱": ("ài", "to love/like to"),
    "水果": ("shuǐguǒ", "fruit"),
    "水": ("shuǐ", "water"),
    "喂": ("wèi", "hello (phone)"),
    "做": ("zuò", "to do"),
    "大卫": ("Dàwèi", "David"),
    "也": ("yě", "also"),
    "没": ("méi", "did not"),
    "学": ("xué", "to learn"),
    "上午": ("shàngwǔ", "morning"),
    "睡觉": ("shuì jiào", "to sleep"),
    "家": ("jiā", "home"),
    "电视": ("diànshì", "TV"),
    "喜欢": ("xǐhuan", "to like"),
    "电影": ("diànyǐng", "movie"),
    "电话": ("diànhuà", "phone"),
    "给": ("gěi", "to"),
    "打": ("dǎ", "to make (a call)"),
    "吧": ("ba", "(suggestion particle)"),
    "哪儿": ("nǎr", "where"),
    "东西": ("dōngxi", "things"),
    "看见": ("kànjiàn", "to see"),
    "先生": ("xiānsheng", "Mr."),
    "开车": ("kāi chē", "to drive"),
    "回来": ("huílái", "to come back"),
    "四十": ("sìshí", "forty"),
    "分钟后": ("fēnzhōng hòu", "after (X) minutes"),
    "衣服": ("yīfu", "clothes"),
    "漂亮": ("piàoliang", "pretty"),
    "是啊": ("shì a", "yes (agreeing)"),
    "不少": ("bùshǎo", "quite a few"),
    "都": ("dōu", "all"),
    "这些": ("zhèxiē", "these"),
    "和": ("hé", "and"),
    "认识": ("rènshi", "to know (someone)"),
    "出租车": ("chūzūchē", "taxi"),
    "飞机": ("fēijī", "airplane"),
    "饭店": ("fàndiàn", "hotel/restaurant"),
    "怎么": ("zěnme", "how"),
    "一起": ("yìqǐ", "together"),
    "高兴": ("gāoxìng", "happy/glad"),
    "听": ("tīng", "to listen"),
    "说": ("shuō", "to say"),
    "是的": ("shì de", "yes"),
    "李月": ("Lǐ Yuè", "Li Yue (name)"),
    "张": ("Zhāng", "Zhang (surname)"),
    "李": ("Lǐ", "Li (surname)"),
    "大学": ("dàxué", "university"),
    "一点儿": ("yìdiǎnr", "a little bit"),
    "苹果": ("píngguǒ", "apple"),
    "分钟": ("fēnzhōng", "minute"),
    "后": ("hòu", "after"),
    "些": ("xiē", "some"),
    "多": ("duō", "more"),
    "都没": ("dōu méi", "all not"),
    "李老师": ("Lǐ lǎoshī", "Teacher Li"),
    "她的": ("tā de", "her"),
    "好": ("hǎo", "good"),
    "吃": ("chī", "to eat"),
    "饭": ("fàn", "meal"),
    "看书": ("kàn shū", "to read"),
    "看": ("kàn", "to see/watch"),
    "书": ("shū", "book"),
    "电视": ("diànshì", "TV"),
    "那": ("nà", "that"),
    "个": ("gè", "(measure word)"),
    "这": ("zhè", "this"),
    "在": ("zài", "at"),
    "的": ("de", "(possessive)"),
    "和": ("hé", "and"),
    "不好": ("bù hǎo", "not good"),
    "不太": ("bú tài", "not too"),
    "不要": ("bú yào", "don't"),
    "不客气": ("bú kèqi", "you're welcome"),
    "不谢": ("bú xiè", "don't thank"),
    "不会": ("bú huì", "cannot"),
    "不是": ("bú shì", "not is"),
    "不在": ("bú zài", "not at"),
    "没有": ("méiyǒu", "don't have"),
    "没买": ("méi mǎi", "didn't buy"),
    "没看": ("méi kàn", "didn't see"),
}

# ── Segment Chinese text using greedy longest-match ──
def segment(cn_text):
    """Segment Chinese text into words using greedy longest-match."""
    # Remove spaces from Chinese text
    cn = cn_text.replace(' ', '')
    # Split into text and punctuation
    # Punctuation: Chinese + ASCII
    punct_set = set('，。？！、；：""''（）《》！？.,;:()')
    result = []
    i = 0
    n = len(cn)
    while i < n:
        if cn[i] in punct_set:
            result.append(cn[i])
            i += 1
            continue
        if cn[i].isdigit():
            # Read full number
            num_start = i
            while i < n and (cn[i].isdigit()):
                i += 1
            result.append(cn[num_start:i])
            continue
        # Try longest match from dictionary (max 4 chars)
        matched = False
        for length in range(min(4, n - i), 0, -1):
            word = cn[i:i+length]
            if word in WD:
                result.append(word)
                i += length
                matched = True
                break
        if not matched:
            result.append(cn[i])
            i += 1
    return result

def make_split(words):
    """Generate split string from segmented words."""
    return ' '.join(words)

def make_dict(words, pinyin_text):
    """Generate dict from segmented words."""
    d = {}
    for w in words:
        if w in WD:
            py, en = WD[w]
            d[w] = f"{py} / {en}"
        elif len(w) == 1 and '\u4e00' <= w <= '\u9fff':
            # Single character not in dict - use placeholder
            d[w] = f"? / ?"
    return d

# ── English translations for all sentences ──
# Keyed by Chinese text (exact match)
EN_TRANS = {
    # Lesson 1
    "你好！": "Hello!",
    "您好！": "Hello! (polite)",
    "你们好！": "Hello everyone!",
    "对不起！": "Sorry!",
    "没关系！": "It doesn't matter!",
    # Lesson 2
    "谢谢！": "Thank you!",
    "不谢！": "You're welcome!",
    "谢谢你！": "Thank you!",
    "不客气！": "You're welcome!",
    "再见！": "Goodbye!",
    # Lesson 3
    "你叫什么名字？": "What is your name?",
    "我叫李月。": "My name is Li Yue.",
    "你是老师吗？": "Are you a teacher?",
    "我不是老师，我是学生。": "I am not a teacher, I am a student.",
    "你是中国人吗？": "Are you Chinese?",
    "我不是中国人，我是美国人。": "I am not Chinese, I am American.",
    # Lesson 4
    "她是谁？": "Who is she?",
    "她是我的汉语老师，她叫李月。": "She is my Chinese teacher, her name is Li Yue.",
    "你是哪国人？": "What nationality are you?",
    "我是美国人。你呢？": "I am American. And you?",
    "我是中国人。": "I am Chinese.",
    "他是谁？": "Who is he?",
    "他是我同学。": "He is my classmate.",
    "她呢？她是你同学吗？": "What about her? Is she your classmate?",
    "她不是我同学，她是我朋友。": "She is not my classmate, she is my friend.",
    # Lesson 5
    "你家有几口人？": "How many people are in your family?",
    "我家有三口人。": "There are three people in my family.",
    "你女儿几岁了？": "How old is your daughter?",
    "她今年四岁了。": "She is four years old this year.",
    "李老师多大了？": "How old is Teacher Li?",
    "她今年五十岁了。": "She is fifty years old this year.",
    "她女儿呢？": "What about her daughter?",
    "她女儿今年二十岁。": "Her daughter is twenty years old this year.",
    # Lesson 6
    "你会说汉语吗？": "Can you speak Chinese?",
    "我会说汉语。": "I can speak Chinese.",
    "你妈妈会说汉语吗？": "Can your mom speak Chinese?",
    "她不会说。": "She cannot speak it.",
    "中国菜好吃吗？": "Is Chinese food delicious?",
    "中国菜很好吃。": "Chinese food is very delicious.",
    "你会做中国菜吗？": "Can you make Chinese food?",
    "我不会做。": "I cannot make it.",
    "你会写汉字吗？": "Can you write Chinese characters?",
    "我会写。": "I can write.",
    "这个字怎么写？": "How do you write this character?",
    "对不起，这个字我会读，不会写。": "Sorry, I can read this character, but I cannot write it.",
    # Lesson 7
    "请问，今天几号？": "Excuse me, what's the date today?",
    "今天 9 月 1 号。": "Today is September 1st.",
    "今天星期几？": "What day of the week is it today?",
    "星期三。": "Wednesday.",
    "昨天是几月几号？": "What was the date yesterday?",
    "昨天是 8 月 31 号，星期二。": "Yesterday was August 31st, Tuesday.",
    "明天呢？": "What about tomorrow?",
    "明天是 9 月 2 号，星期四。": "Tomorrow is September 2nd, Thursday.",
    "明天星期六，你去学校吗？": "Tomorrow is Saturday, are you going to school?",
    "我去学校。": "I am going to school.",
    "你去学校做什么？": "What are you going to school for?",
    "我去学校看书。": "I am going to school to read books.",
    # Lesson 8
    "你想喝什么？": "What do you want to drink?",
    "我想喝茶。": "I want to drink tea.",
    "你想吃什么？": "What do you want to eat?",
    "我想吃米饭。": "I want to eat rice.",
    "下午你想做什么？": "What do you want to do this afternoon?",
    "下午我想去商店。": "I want to go to the store this afternoon.",
    "你想买什么？": "What do you want to buy?",
    "我想买一个杯子。": "I want to buy a cup.",
    "你好！这个杯子多少钱？": "Hello! How much is this cup?",
    "二十八块。": "Twenty-eight yuan.",
    "那个杯子多少钱？": "How much is that cup?",
    "那个杯子十八块钱。": "That cup is eighteen yuan.",
    "小猫在哪儿？": "Where is the kitten?",
    "小猫在那儿。": "The kitten is there.",
    "小狗在哪儿？": "Where is the puppy?",
    "小狗在椅子下面。": "The puppy is under the chair.",
    # Lesson 9
    "你在哪儿工作？": "Where do you work?",
    "我在学校工作。": "I work at a school.",
    "你儿子在哪儿工作？": "Where does your son work?",
    "我儿子在医院工作，他是医生。": "My son works at a hospital, he is a doctor.",
    "你爸爸在家吗？": "Is your dad at home?",
    "不在家。": "He is not at home.",
    "他在哪儿呢？": "Where is he?",
    "他在医院。": "He is at the hospital.",
    # Lesson 10
    "桌子上有什么？": "What is on the table?",
    "桌子上有一个电脑和一本书。": "There is a computer and a book on the table.",
    "杯子在哪儿？": "Where is the cup?",
    "杯子在桌子里。": "The cup is in the table.",
    "前面那个人叫什么名字？": "What is the name of the person in front?",
    "她叫王方，在医院工作。": "Her name is Wang Fang, she works at a hospital.",
    "后面那个人呢？他叫什么名字？": "What about the person behind? What is his name?",
    "他叫谢朋，在商店工作。": "His name is Xie Peng, he works at a store.",
    "这儿有人吗？": "Is anyone here?",
    "没有。": "No.",
    "我能坐这儿吗？": "Can I sit here?",
    "请坐。": "Please sit.",
    # Lesson 11
    "现在几点？": "What time is it now?",
    "现在十点十分。": "It is 10:10 now.",
    "中午几点吃饭？": "What time do we eat lunch?",
    "十二点吃饭。": "We eat at twelve o'clock.",
    "爸爸什么时候回家？": "When does dad come home?",
    "下午五点。": "Five o'clock in the afternoon.",
    "我们什么时候去看电影？": "When are we going to watch a movie?",
    "六点三十分。": "Six thirty.",
    "我星期一去北京。": "I am going to Beijing on Monday.",
    "你想在北京住几天？": "How many days do you want to stay in Beijing?",
    "住三天。": "Stay for three days.",
    "星期五前能回家吗？": "Can you come home before Friday?",
    "能。": "Yes, I can.",
    # Lesson 12
    "昨天北京的天气怎么样？": "How was the weather in Beijing yesterday?",
    "太热了。": "Too hot.",
    "明天呢？明天天气怎么样？": "What about tomorrow? How will the weather be tomorrow?",
    "明天天气很好，不冷不热。": "Tomorrow the weather will be very good, not cold and not hot.",
    "今天会下雨吗？": "Will it rain today?",
    "今天不会下雨。": "It will not rain today.",
    "王小姐今天会来吗？": "Will Miss Wang come today?",
    "不会来，天气太冷了。": "She won't come, the weather is too cold.",
    "你身体怎么样？": "How is your health?",
    "我身体不太好。天气太热了，不爱吃饭。": "I am not feeling well. The weather is too hot, I don't want to eat.",
    "你多吃些水果，多喝水。": "Eat more fruit and drink more water.",
    "谢谢你，医生。": "Thank you, doctor.",
    # Lesson 13
    "喂，你在做什么呢？": "Hello, what are you doing?",
    "我在看书呢。": "I am reading a book.",
    "大卫也在看书吗？": "Is David also reading?",
    "他没看书，他在学做中国菜呢。": "He is not reading, he is learning to make Chinese food.",
    "昨天上午你在做什么呢？": "What were you doing yesterday morning?",
    "我在睡觉呢。你呢？": "I was sleeping. And you?",
    "我在家看电视呢。你喜欢看电视吗？": "I was watching TV at home. Do you like watching TV?",
    "我不喜欢看电视，我喜欢看电影。": "I don't like watching TV, I like watching movies.",
    "82304155，这是李老师的电话吗？": "82304155, is this Teacher Li's phone number?",
    "不是。她的电话是 82304156。": "No. Her phone number is 82304156.",
    "好，我现在给她打电话。": "OK, I will call her now.",
    "她在工作呢，你下午打吧。": "She is working now, call her in the afternoon.",
    # Lesson 14
    "昨天上午你去哪儿了？": "Where did you go yesterday morning?",
    "我去商店买东西了。": "I went to the store to buy things.",
    "你买什么了？": "What did you buy?",
    "我买了一点儿苹果。": "I bought a few apples.",
    "你看见张先生了吗？": "Did you see Mr. Zhang?",
    "看见了，他去学开车了。": "I saw him, he went to learn driving.",
    "他什么时候能回来？": "When can he come back?",
    "四十分钟后回来。": "He will come back after forty minutes.",
    "王方的衣服太漂亮了！": "Wang Fang's clothes are too pretty!",
    "是啊，她买了不少衣服。": "Yes, she bought quite a few clothes.",
    "你买什么了？": "What did you buy?",
    "我没买，这些都是王方的东西。": "I didn't buy anything, these are all Wang Fang's things.",
    # Lesson 15
    "你和李小姐是什么时候认识的？": "When did you and Miss Li meet?",
    "我们是 2011 年 9 月认识的。": "We met in September 2011.",
    "你们在哪儿认识的？": "Where did you meet?",
    "我们是在学校认识的，她是我大学同学。": "We met at school, she is my university classmate.",
    "你们是怎么来饭店的？": "How did you come to the hotel?",
    "我们是坐出租车来的。": "We came by taxi.",
    "李先生呢？": "What about Mr. Li?",
    "他是和朋友一起开车来的。": "He came driving with a friend.",
    "很高兴认识您！李小姐。": "Very nice to meet you! Miss Li.",
    "认识你我也很高兴！": "I am also very glad to meet you!",
    "听张先生说，您是坐飞机来北京的？": "I heard from Mr. Zhang that you came to Beijing by plane?",
    "是的。": "Yes.",
}

# ── Generate TypeScript code ──
CN_NUM_MAP = {
    '一': '1', '二': '2', '三': '3', '四': '4', '五': '5',
    '六': '6', '七': '7', '八': '8', '九': '9', '十': '10',
    '零': '0', '两': '2',
}

def generate_ts():
    lines = []
    lines.append("    {")
    lines.append("      id: 'hsk-standard-1',")
    lines.append("      categoryId: 'hsk',")
    lines.append("      title: '《HSK标准教程》第一册',")
    lines.append("      titleEn: 'HSK Standard Course 1',")
    lines.append("      level: 'HSK 1',")
    lines.append("      lessons: [")

    sent_id_counter = 0
    for li, lesson in enumerate(lessons):
        lesson_num = li + 1
        # Extract lesson title (e.g. "第一课 你好" → "第一课 你好")
        lesson_title = lesson['title']
        lines.append("        {")
        lines.append(f"          id: 'hsk1-lesson{lesson_num}',")
        lines.append(f"          title: '{lesson_title}',")
        lines.append(f"          titleEn: 'Lesson {lesson_num}',")
        lines.append("          texts: [")

        for si, scene in enumerate(lesson['scenes']):
            scene_num = si + 1
            # Clean up scene label
            scene_label = scene['label']
            lines.append("            {")
            lines.append(f"              id: 'hsk1-l{lesson_num}-s{scene_num}',")
            lines.append(f"              label: '{scene_label}',")
            lines.append("              sentences: [")

            for sdata in scene['sentences']:
                sent_id_counter += 1
                cn = sdata['cn']
                pinyin = sdata['pinyin']

                # Get English translation
                en = EN_TRANS.get(cn, "")
                if not en:
                    # Try removing spaces
                    en = EN_TRANS.get(cn.replace(' ', ''), "")
                if not en:
                    print(f"  WARNING: No translation for: {cn}")
                    en = "(translation needed)"

                # Segment
                words = segment(cn)
                split_str = make_split(words)
                dict_obj = make_dict(words, pinyin)

                # Escape quotes in strings
                cn_esc = cn.replace("'", "\\'")
                split_esc = split_str.replace("'", "\\'")
                en_esc = en.replace("'", "\\'")

                sid = f'hsk1-l{lesson_num}s{si+1}n{sent_id_counter}'
                lines.append("                {")
                lines.append(f"                  id: '{sid}',")
                lines.append(f"                  cn: \"{cn_esc}\",")
                lines.append(f"                  split: \"{split_esc}\",")
                lines.append(f"                  en: \"{en_esc}\",")
                lines.append("                  dict: {")
                for w, v in dict_obj.items():
                    w_esc = w.replace("'", "\\'")
                    v_esc = v.replace("'", "\\'")
                    lines.append(f"                    \"{w_esc}\": \"{v_esc}\",")
                lines.append("                  },")
                lines.append("                },")

            lines.append("              ],")
            lines.append("            },")

        lines.append("          ],")
        lines.append("        },")

    lines.append("      ]")
    lines.append("    }")

    return '\n'.join(lines)

# Generate and save
ts_code = generate_ts()
with open('hsk1_content.ts.txt', 'w', encoding='utf-8') as f:
    f.write(ts_code)
print(f"\nGenerated TypeScript code ({len(ts_code)} chars)")
print("Saved to hsk1_content.ts.txt")
print("\nFirst 50 lines:")
for line in ts_code.split('\n')[:50]:
    print(line)
