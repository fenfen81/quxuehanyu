"""
gen_hsk_words.py
把 HSK1-6 词表 xls 解析为 src/data/hskWords.ts
格式：{ id, hanzi, pinyin, english, pos, level, emoji }
"""
import sys, shutil, os, json, re
sys.stdout.reconfigure(encoding='utf-8')
import openpyxl

HSK_DIR = 'D:/我的外国学生的汉语教学相关资料/steven（俄罗斯）汉语教学相关文件/HSK相关文件/'
TMP_DIR = 'C:/tmp_hsk/'
OUT_TS  = 'C:/ProgramData/WorkBuddy/chromium-env/1365jvd/WorkBuddy/2026-06-16-11-47-45/app/src/data/hskWords.ts'

os.makedirs(TMP_DIR, exist_ok=True)
os.makedirs(os.path.dirname(OUT_TS), exist_ok=True)

# ── Emoji mapping (HSK1 高频词为主，其余给默认) ──────────────────────────────
EMOJI_MAP = {
    # 人物/称谓
    '爱':'❤️','爸爸':'👨','北京':'🏙️','不':'❌','大':'🔷','的':'📎',
    '地铁':'🚇','弟弟':'👦','东西':'📦','都':'🌐','对不起':'🙏',
    '多':'➕','多少':'🔢','儿子':'👶','二':'2️⃣','饭店':'🏨',
    '飞机':'✈️','分钟':'⏱️','高兴':'😊','个':'1️⃣','工作':'💼',
    '狗':'🐕','汉语':'🇨🇳','好':'👍','喝':'🥤','和':'🤝',
    '很':'💪','后面':'⬅️','回':'🔙','会':'📚','几':'🔢',
    '家':'🏠','叫':'📢','今天':'📅','九':'9️⃣','开':'🔓',
    '看':'👀','看见':'👁️','块':'🟦','来':'👋','老师':'👩‍🏫',
    '了':'✅','冷':'🥶','里':'📍','六':'6️⃣','妈妈':'👩',
    '吗':'❓','买':'🛒','猫':'🐱','没':'🚫','没有':'❌',
    '们':'👥','名字':'🏷️','明天':'📆','哪':'❓','哪儿':'📍',
    '那':'👉','呢':'🤔','能':'💡','你':'👤','你好':'👋',
    '年':'📅','女儿':'👧','朋友':'👫','漂亮':'💄','苹果':'🍎',
    '七':'7️⃣','钱':'💰','前面':'➡️','去':'🚶','热':'🔥',
    '人':'👤','认识':'🤝','日':'☀️','三':'3️⃣','商店':'🏪',
    '上':'⬆️','上午':'🌅','谁':'❓','什么':'❓','十':'🔟',
    '时候':'⏰','是':'✔️','书':'📖','水':'💧','水果':'🍓',
    '睡觉':'😴','说':'💬','四':'4️⃣','岁':'🎂','他':'👨',
    '她':'👩','太':'😮','天气':'🌤️','听':'👂','同学':'🧑‍🤝‍🧑',
    '我':'🙋','我们':'👥','五':'5️⃣','下':'⬇️','下午':'🌆',
    '下雨':'🌧️','先生':'👔','现在':'🕐','想':'💭','小':'🔹',
    '小姐':'👒','些':'📋','写':'✍️','谢谢':'🙏','星期':'📅',
    '学生':'🎒','学习':'📚','学校':'🏫','一':'1️⃣','医生':'👨‍⚕️',
    '医院':'🏥','椅子':'🪑','有':'✅','月':'🌙','再见':'👋',
    '在':'📍','怎么':'❓','怎么样':'🤔','这':'👈','中国':'🇨🇳',
    '中午':'☀️','住':'🏡','桌子':'🪑','字':'📝','坐':'💺',
    # HSK2 常见词
    '吧':'🤔','白':'⬜','帮助':'🤝','报纸':'📰','比':'⚖️',
    '别':'🚫','宾馆':'🏨','长':'📏','唱歌':'🎵','出':'🚪',
    '穿':'👕','次':'🔢','从':'📌','错':'❌','打电话':'📱',
    '大家':'👥','打算':'📋','到':'📍','得':'✅','等':'⏳',
    '第一':'🥇','懂':'💡','对':'✔️','房间':'🚪','非常':'🌟',
    '服务员':'🤵','高':'📏','告诉':'💬','哥哥':'👦','给':'🎁',
    '公共汽车':'🚌','公司':'🏢','贵':'💎','过':'⏩','还':'🔄',
    '黑':'⬛','红':'🔴','欢迎':'🎉','还是':'🤔','会议':'📊',
    '机场':'✈️','鸡蛋':'🥚','件':'👔','教':'📖','姐姐':'👩',
    '介绍':'🤝','进':'🚶','近':'📍','就':'➡️','觉得':'💭',
    '咖啡':'☕','开始':'▶️','考试':'📝','可能':'🤔','可以':'✅',
    '课':'📚','块':'🟦','快':'⚡','快乐':'😊','累':'😓',
    '离':'📏','路':'🛣️','旅游':'✈️','卖':'🏷️','慢':'🐢',
    '忙':'💼','帽子':'🎩','面条':'🍜','男':'👨','您':'👤',
    '牛奶':'🥛','努力':'💪','啤酒':'🍺','便宜':'💰','千':'🔢',
    '铅笔':'✏️','请':'🙏','去年':'📅','让':'🤝','日记':'📖',
    '上班':'💼','身体':'💪','生病':'🤒','生日':'🎂','时间':'⏰',
    '事情':'📋','手表':'⌚','手机':'📱','说话':'💬','送':'🎁',
    '虽然':'🤔','它':'🐾','踢足球':'⚽','题':'📝','跳舞':'💃',
    '外':'🌍','玩':'🎮','晚上':'🌙','为什么':'❓','问':'❓',
    '问题':'❓','西瓜':'🍉','希望':'🌈','洗':'🧼','小时':'⏰',
    '笑':'😄','新':'✨','新闻':'📰','行李箱':'🧳','需要':'⚡',
    '选择':'📋','眼睛':'👀','药':'💊','也':'➕','一起':'🤝',
    '已经':'✅','意思':'💡','因为':'📎','游泳':'🏊','右边':'➡️',
    '鱼':'🐟','语言':'💬','原来':'💡','远':'🌍','运动':'🏃',
    '左边':'⬅️',
}

DEFAULT_EMOJI_BY_POS = {
    '名': '📦', '动': '🔄', '形': '🔹', '副': '💨',
    '介': '📌', '连': '🔗', '助': '📎', '叹': '💬',
    '数': '🔢', '量': '📏', '代': '👤', '能愿': '✅',
    '区别词': '🔷', '拟声': '🔊', '前缀': '🔑', '后缀': '🔑',
}

POS_EN = {
    '名': 'n', '动': 'v', '形': 'adj', '副': 'adv',
    '介': 'prep', '连': 'conj', '助': 'part', '叹': 'interj',
    '数': 'num', '量': 'mw', '代': 'pron', '能愿': 'modal',
    '区别词': 'attr', '拟声': 'onom', '前缀': 'prefix', '后缀': 'suffix',
}

def get_emoji(hanzi, pos):
    if hanzi in EMOJI_MAP:
        return EMOJI_MAP[hanzi]
    return DEFAULT_EMOJI_BY_POS.get(pos, '📝')

words = []
id_counter = 1

for level in [1, 2, 3, 4, 5, 6]:
    src = HSK_DIR + f'HSK词汇表-{level}级.xls'
    dst = TMP_DIR + f'hsk{level}.xlsx'
    shutil.copy(src, dst)
    wb = openpyxl.load_workbook(dst, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    count = 0
    for row in rows:
        # 跳过标题行（第一列不是数字序号的行）
        if not row or row[0] is None:
            continue
        try:
            num = int(float(str(row[0])))
        except (ValueError, TypeError):
            continue
        hanzi   = str(row[1]).strip() if row[1] else ''
        pinyin  = str(row[2]).strip() if row[2] else ''
        english = str(row[3]).strip() if row[3] else ''
        pos     = str(row[4]).strip() if row[4] else ''
        if not hanzi or not pinyin:
            continue
        # 清理英文翻译（去掉多余空白和特殊字符）
        english = re.sub(r'\s+', ' ', english).strip()
        # 截取第一个含义（分号前）
        first_en = english.split(';')[0].split(',')[0].strip()
        if len(first_en) > 60:
            first_en = first_en[:57] + '...'
        emoji = get_emoji(hanzi, pos)
        pos_en = POS_EN.get(pos, pos)
        words.append({
            'id': f'hsk{level}_{id_counter:04d}',
            'hanzi': hanzi,
            'pinyin': pinyin,
            'english': first_en or english[:60],
            'fullEnglish': english[:120],
            'pos': pos_en,
            'posCn': pos,
            'level': level,
            'emoji': emoji,
        })
        id_counter += 1
        count += 1
    print(f'HSK{level}: {count} 词')

print(f'\n总计: {len(words)} 词')

# ── 生成 TypeScript ───────────────────────────────────────────────────────────
lines = [
    '// 自动生成 - 勿手动修改',
    '// 来源：HSK1-6 官方词汇表',
    '',
    'export interface HskWord {',
    '  id: string',
    '  hanzi: string',
    '  pinyin: string',
    '  english: string',
    '  fullEnglish: string',
    '  pos: string      // v / n / adj / adv ...',
    '  posCn: string    // 动 / 名 / 形 ...',
    '  level: 1 | 2 | 3 | 4 | 5 | 6',
    '  emoji: string',
    '}',
    '',
    'export const hskWords: HskWord[] = [',
]

for w in words:
    hanzi_esc  = w['hanzi'].replace("'", "\\'")
    pinyin_esc = w['pinyin'].replace("'", "\\'")
    en_esc     = w['english'].replace("'", "\\'")
    fen_esc    = w['fullEnglish'].replace("'", "\\'")
    pos_esc    = w['pos'].replace("'", "\\'")
    posC_esc   = w['posCn'].replace("'", "\\'")
    emoji_esc  = w['emoji']
    lines.append(
        f"  {{ id: '{w['id']}', hanzi: '{hanzi_esc}', pinyin: '{pinyin_esc}', "
        f"english: '{en_esc}', fullEnglish: '{fen_esc}', "
        f"pos: '{pos_esc}', posCn: '{posC_esc}', level: {w['level']}, emoji: '{emoji_esc}' }},"
    )

lines.append(']')
lines.append('')
lines.append('export const hskWordsByLevel = (level: 1|2|3|4|5|6) =>')
lines.append('  hskWords.filter(w => w.level === level)')
lines.append('')

ts_content = '\n'.join(lines)
with open(OUT_TS, 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f'\n✅ 已写入 {OUT_TS}')
print(f'   文件大小: {os.path.getsize(OUT_TS) // 1024} KB')
