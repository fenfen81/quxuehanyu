// ══════════════════════════════════════════════════════════════════════════════
import { hskWords } from '../data/hskWords'

//  句子分段工具 — 汉语意群切分（按用户给定的 HSK5 分段规则 v3）
//  规则要点：
//    1) 逻辑虚词强制单独成碎片（不受字数限制）：
//       转折：但/可是/然而   递进：并且/而且   承接：随后/然后/于是/过了一会儿
//       介词：为/在/从/把/被/对于   因果：因为/所以   并列：而/又
//    2) 意群不可拆分：副词+动词、形容词+名词（暗暗点头、温暖的气息）、
//       完整动宾/成语/惯用搭配/动作链条、介词后置完整内容，整块为 1 碎片，
//       严禁切碎修饰词与中心词（几年如一日地照顾她 必须完整）。
//    3) 双维度梯度：≤10字单层不拆；11–25字→3–6块；≥26字→5–12块（长句放宽以免破坏意群）；
//       普通意群碎片≥3字，杜绝单字孤立碎片。
//    4) 标点（，。；：！？…、：“”‘’（））为天然分割点；对话句说话人单独一块、引号内单独一块。
// ══════════════════════════════════════════════════════════════════════════════

const PUNCT = new Set(['。', '！', '？', '；', '…', '，', '、', '：', '“', '”', '‘', '’', '（', '）'])

/** 连接词 / 复句关联词：独立成碎片（不抓取宾语）；含并列连词 和/与/同 */
const CONN = new Set([
  '但是', '但', '可是', '然而', '所以', '因此', '而且', '并且', '于是', '不过', '否则', '那么',
  '随后', '然后', '接着', '因为', '由于', '如果', '虽然', '只要', '只有', '不论', '无论', '为了', '除了',
  '即使', '虽说', '只是', '其实', '另外', '这样一来', '也就是说', '而', '又', '因', '所', '故', '故而',
  '反之', '再说', '还是', '或者', '果然', '居然', '虽', '和', '与', '同',
])

/** 介词：独立成碎片，并抓取其后完整介词短语（到下一谓语/主语/连接词/标点为止）。
 *  注意：不把"对"列入介词——"对"在 HSK5 中绝大多数是量词（一对夫妻）或动词，
 *  列为介词会在"X对夫妻"处错误断句，破坏意群。 */
const PREP = new Set([
  '为', '给', '向', '跟', '从', '比', '往', '朝', '替', '由', '距', '离', '在', '到', '把', '被',
  '对于', '关于', '将',
])

const NEG = new Set(['不', '没', '没有', '别', '未', '无', '莫', '甭', '毫不', '决不', '并不'])

/** 能愿动词（拆分启发式：出现时在其前切出 主语|谓语） */
const MODAL = new Set([
  '想', '要', '会', '能', '能够', '可以', '应该', '应当', '肯', '敢', '得', '愿意', '喜欢',
  '希望', '打算', '准备', '决定', '开始', '继续', '试着', '爱', '怕', '舍得',
])

/** 量词（仅用于识别，不再作为切分点——量词切分会破坏"X对夫妻/一套新房"等意群） */

/** 常用动词（用于判断介词短语终点 / 主谓界限） */
const VERB = new Set([
  '说', '看', '听', '走', '跑', '吃', '喝', '买', '卖', '来', '去', '回', '到', '做', '作', '写', '读',
  '知', '知道', '认', '认识', '学', '教', '给', '拿', '放', '开', '关', '站', '坐', '躺', '睡', '醒',
  '死', '活', '生', '病', '帮', '找', '用', '叫', '让', '使', '请', '问', '答', '谢', '送', '接', '带',
  '比', '像', '成', '变', '改', '换', '选', '评', '增', '加', '减', '得', '失', '赢', '输', '红', '吵',
  '笑', '哭', '飞', '落', '掉', '丢', '忘', '记', '懂', '明白', '会', '见', '参加', '放弃', '影响',
  '取消', '保护', '照顾', '鼓励', '选择', '介绍', '表演', '比赛', '结婚', '离婚', '入围', '瘫痪',
  '感动', '吃惊', '伸', '赶', '靠', '住', '累', '续', '叮', '醒', '躺', '评', '写', '说', '看', '想',
  '觉得', '认为', '希望', '决定', '开始', '继续', '停', '等', '跟', '和', '同',
])

/** 双字动词（判断动语|宾语切分点；仅收动词，不收"爱情/教室"等以动词字开头的名词） */
const VERB2 = new Set([
  '选出', '评为', '入围', '决定', '离开', '准备', '坚持', '想象', '感受', '增加', '减少', '放弃',
  '介绍', '表演', '比赛', '结婚', '离婚', '瘫痪', '感动', '吃惊', '选择', '保护', '照顾', '鼓励',
  '取消', '开始', '继续', '觉得', '认为', '希望', '打算', '喜欢', '学习', '发现', '发生', '表示',
  '要求', '需要', '具有', '进行', '完成', '实现', '达到', '成为', '以为', '感到', '充满', '包括',
  '属于', '证明', '说明', '解释', '理解', '注意', '忘记', '记得', '认识', '了解', '研究', '发展',
  '提高', '降低', '改变', '保持', '出现', '存在', '产生', '引起', '导致', '形成', '建立', '创造',
  '设计', '使用', '利用', '练习', '考试', '解决', '处理', '管理', '控制', '组织', '安排', '计划',
  '讨论', '成功', '辞职', '创业', '投资', '赚钱', '消费', '购买', '支付', '接受', '拒绝', '同意',
  '支持', '防止', '避免', '获得', '取得', '失去', '保留', '开展', '举行', '举办', '召开', '发表',
  '宣布', '翻译', '创作', '写作', '演奏', '演唱', '导演', '拍摄', '放映', '展览', '展示', '驾驶',
  '航行', '游泳', '钓鱼', '旅行', '旅游', '参观', '访问', '调查', '分析', '总结', '比较', '对比',
  '参考', '模仿', '编辑', '编写', '绘画', '录音', '录像', '播放', '播出', '上映', '直播', '交流',
  '沟通', '体现', '反映', '推动', '促进', '改善', '改进', '提升', '下降', '上涨', '下跌', '销售',
  '收取', '接受', '同意', '反对', '阻止', '战胜', '克服', '赢得', '丢失', '积累', '增长', '缩小',
  '延长', '缩短', '修建', '修复', '维修', '装修', '装饰', '布置', '安装', '调试', '运行', '操作',
  '散步', '锻炼', '训练', '考察', '归纳', '推理', '判断', '推测', '猜测', '预测', '估计', '计算',
  '测量', '统计', '对照', '借鉴', '复制', '传播', '流传', '传承', '继承', '发扬', '创新', '改革',
  '开放', '建设', '建造', '修复', '发表', '发布', '宣传', '推广', '采集', '收获', '种植', '饲养',
  '倾听', '注视', '拥抱', '亲吻', '陪伴', '守护', '思念', '怀念', '期待', '盼望', '向往', '追求',
  '争取', '赢得', '换取', '交换', '分享', '分担', '承担', '担任', '胜任', '具备', '缺乏', '拥有',
  '丧失', '恢复', '康复', '痊愈', '受伤', '中毒', '过敏', '咳嗽', '发烧', '感冒', '住院', '出院',
])

/** 代词 / 指代词（介词短语抓取时，作为首个宾语可抓，若出现在抓取中段则为新主语，停止） */
const PRON = new Set([
  '我', '你', '他', '她', '它', '我们', '你们', '他们', '她们', '它们', '自己', '别人', '大家', '彼此',
  '谁', '这', '那', '这个', '那个', '这些', '那些', '什么', '怎么', '怎样', '为什么', '哪里', '哪',
  '此', '各', '每', '某', '其',
])

const hanLen = (s: string): number => (s.match(/[一-鿿]/g) || []).length
const MAX_CHUNK = 14

interface Frag { t: string; prot: boolean }

const joinWords = (ws: string[]): string => ws.join(' ').replace(/\s+/g, ' ').trim()

export function normalizeText(s: string): string {
  return s.replace(/[^一-鿿a-zA-Z0-9]/g, '').toLowerCase()
}

/** 把一段分句（无标点的词数组）切成碎片：逻辑虚词独立，介词抓取完整短语，其余整体在意群内 */
function chunkClause(tokens: string[]): Frag[] {
  const out: Frag[] = []
  let cur: string[] = []
  const flush = () => {
    if (cur.length) {
      out.push({ t: joinWords(cur), prot: false })
      cur = []
    }
  }
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i]
    // 连接词：前后断开，单独成碎片
    if (CONN.has(w)) {
      flush()
      out.push({ t: w, prot: true })
      continue
    }
    // 介词：独立成碎片并抓取其后完整介词短语
    if (PREP.has(w)) {
      const nxt = tokens[i + 1]
      // 为 + 不（如"从+不"）不抓取，保留"从不"等整体在内容段
      if (nxt && NEG.has(nxt) && w === '从') {
        cur.push(w)
        continue
      }
      flush()
      let obj = w
      i++
      let grabbed = 0
      while (i < tokens.length) {
        const tk = tokens[i]
        if (PUNCT.has(tk) || CONN.has(tk) || PREP.has(tk) || MODAL.has(tk) || VERB.has(tk) || NEG.has(tk)) break
        // 抓取中段出现代词 → 视为新主语，停止介词短语
        if (grabbed > 0 && PRON.has(tk)) break
        obj += ' ' + tk
        i++
        grabbed++
        if (grabbed >= 8) break
      }
      i-- // 回退最后多进的一位
      out.push({ t: obj, prot: true })
      continue
    }
    // 能愿动词：在其前切出 主语 | 谓语（谓语含能愿动词），不孤立
    if (MODAL.has(w) && cur.length) {
      flush()
    }
    cur.push(w)
  }
  flush()
  return out
}

/** 找安全的切分点：优先 动语|宾语 / 主语|谓语（在动词或能愿动词边界），
 *  且切面不能紧贴"的"（保持 修饰+的+中心词 完整），两侧均 ≥2 字。
 *  找不到则返回 null（宁可少切块，也不破坏意群）。 */
function findSafeCut(toks: string[]): number | null {
  const isVerb = (t: string) => VERB.has(t) || VERB2.has(t)
  const deAdj = (k: number) => toks[k - 1] === '的' || toks[k] === '的'
  const ok = (k: number) =>
    k > 0 && k < toks.length && !deAdj(k) &&
    hanLen(toks.slice(0, k).join(' ')) >= 2 && hanLen(toks.slice(k).join(' ')) >= 2
  // 1) 能愿动词前切（主语 | 谓语）
  for (let i = 1; i < toks.length; i++) {
    if (MODAL.has(toks[i]) && ok(i)) return i
  }
  // 2) 动词：先试前切（主语|谓语），再试后切（动语|宾语）
  for (let i = 1; i < toks.length; i++) {
    if (isVerb(toks[i])) {
      if (ok(i)) return i
      if (ok(i + 1)) return i + 1
    }
  }
  return null
}

/** 把一个内容碎片进一步切成 2 块（句长/块数控制用）。仅在安全边界切分。 */
function splitOneFragment(text: string): [string, string] | null {
  const toks = text.split(' ').filter(Boolean)
  if (toks.length < 2) return null
  const k = findSafeCut(toks)
  if (k !== null) {
    return [toks.slice(0, k).join(' '), toks.slice(k).join(' ')]
  }
  // 兜底：超长且无动词/能愿边界时，中点切（避开"的"）
  if (hanLen(text) > MAX_CHUNK) {
    const cut = Math.max(1, Math.floor(toks.length / 2))
    if (toks[cut - 1] === '的' || toks[cut] === '的') {
      const alt = cut > 1 ? cut - 1 : cut + 1
      if (alt > 0 && alt < toks.length) {
        return [toks.slice(0, alt).join(' '), toks.slice(alt).join(' ')]
      }
    }
    return [toks.slice(0, cut).join(' '), toks.slice(cut).join(' ')]
  }
  return null
}

function targetRange(totalHan: number): [number, number] {
  if (totalHan <= 10) return [1, 1]
  if (totalHan <= 25) return [3, 6]
  return [5, 12]
}

function mergeAt(frags: Frag[], idx: number): Frag[] {
  const next = frags[idx + 1]
  if (!next) return frags
  const merged: Frag[] = []
  for (let i = 0; i < frags.length; i++) {
    if (i === idx) {
      merged.push({ t: joinWords((frags[i].t + ' ' + next.t).split(' ')), prot: false })
      i++
    } else {
      merged.push(frags[i])
    }
  }
  return merged
}

/** 找一个可合并的相邻非保护碎片对，返回前者下标；优先合并最短的一对（最小破坏） */
function pickMergeable(frags: Frag[]): number {
  let best = -1
  let bestSum = 1e9
  for (let i = 0; i < frags.length - 1; i++) {
    if (!frags[i].prot && !frags[i + 1].prot) {
      const sum = hanLen(frags[i].t) + hanLen(frags[i + 1].t)
      if (sum < bestSum) {
        bestSum = sum
        best = i
      }
    }
  }
  return best
}

function longestNonProt(frags: Frag[]): number {
  let best = -1
  let bestLen = -1
  for (let i = 0; i < frags.length; i++) {
    if (!frags[i].prot && hanLen(frags[i].t) > bestLen) {
      bestLen = hanLen(frags[i].t)
      best = i
    }
  }
  return best
}

/** 孤立单字（1 字）非保护碎片 → 并入相邻的非保护碎片（优先前、次之后）；
 *  2 字内容词（电台/父母）保留；受保护的逻辑虚词（但/而/又/在/为…）绝不并入。 */
function mergeTiny(frags: Frag[]): Frag[] {
  const out: Frag[] = []
  for (let i = 0; i < frags.length; i++) {
    const f = frags[i]
    if (!f.prot && hanLen(f.t) < 2) {
      const prev = out[out.length - 1]
      const nxt = frags[i + 1]
      if (prev && !prev.prot) {
        prev.t = joinWords((prev.t + ' ' + f.t).split(' '))
        continue
      }
      if (nxt && !nxt.prot) {
        nxt.t = joinWords((f.t + ' ' + nxt.t).split(' '))
        continue
      }
    }
    out.push({ ...f })
  }
  return out
}

function controlFrags(frags: Frag[], totalHan: number): Frag[] {
  // 单碎片：超长则兜底切；并据总字数目标向上拆分到合适块数
  if (frags.length === 1) {
    if (!frags[0].prot && hanLen(frags[0].t) > MAX_CHUNK) {
      const sp = splitOneFragment(frags[0].t)
      if (sp) frags = [{ t: sp[0], prot: false }, { t: sp[1], prot: false }]
    }
    const [minB] = targetRange(totalHan)
    let guard = 0
    while (frags.length < minB && guard++ < 30) {
      const idx = longestNonProt(frags)
      if (idx < 0) break
      const sp = splitOneFragment(frags[idx].t)
      if (!sp) break
      frags.splice(idx, 1, { t: sp[0], prot: false }, { t: sp[1], prot: false })
    }
    return frags
  }

  // 1) 超长碎片兜底切
  const capped: Frag[] = []
  for (const f of frags) {
    if (!f.prot && hanLen(f.t) > MAX_CHUNK) {
      let cur = f.t
      while (hanLen(cur) > MAX_CHUNK) {
        const sp = splitOneFragment(cur)
        if (!sp) break
        capped.push({ t: sp[0], prot: false })
        cur = sp[1]
      }
      capped.push({ t: cur, prot: false })
    } else {
      capped.push(f)
    }
  }
  frags = capped

  // 2) 孤立单字碎片 → 并入相邻
  frags = mergeTiny(frags)

  // 3) 块数控制（太多则合并最短相邻内容碎片；太少则拆分最长内容碎片）
  const [minB, maxB] = targetRange(totalHan)
  let guard = 0
  while (frags.length > maxB && guard++ < 50) {
    const idx = pickMergeable(frags)
    if (idx < 0) break
    frags = mergeAt(frags, idx)
  }
  guard = 0
  while (frags.length < minB && guard++ < 50) {
    const idx = longestNonProt(frags)
    if (idx < 0) break
    const sp = splitOneFragment(frags[idx].t)
    if (!sp) break
    frags.splice(idx, 1, { t: sp[0], prot: false }, { t: sp[1], prot: false })
  }

  return frags
}

export function chunkSentence(_cn: string, split: string): string[] {
  const raw = (split || '').split(/\s+/).filter(Boolean)
  if (raw.length === 0) return []

  const noPunct = raw.filter((t) => !PUNCT.has(t))
  const totalHan = hanLen(noPunct.join(''))
  const hasFunc = raw.some((t) => CONN.has(t) || PREP.has(t))

  // 短句（≤10字）且不含逻辑虚词：整体不拆
  if (totalHan <= 10 && !hasFunc) {
    return [joinWords(noPunct)]
  }

  // 按标点把整句先断成若干分句（含"全为标点"的粘连 token，如 ：“ ”）
  const isPunctTok = (t: string) => PUNCT.has(t) || [...t].every((c) => PUNCT.has(c))
  const clauses: string[][] = []
  let cur: string[] = []
  for (const tok of raw) {
    if (isPunctTok(tok)) {
      if (cur.length) {
        clauses.push(cur)
        cur = []
      }
      continue
    }
    cur.push(tok)
  }
  if (cur.length) clauses.push(cur)

  let frags: Frag[] = []
  for (const cl of clauses) {
    if (cl.length === 0) continue
    frags.push(...chunkClause(cl))
  }
  if (frags.length === 0) frags = chunkClause(noPunct)

  frags = controlFrags(frags, totalHan)
  return frags.map((f) => f.t)
}

export const chunkedSplit = chunkSentence

/** 由 dict（词→"拼音 / 英文"）生成每个碎片的英文（保留向后兼容，UI 现优先用 sentence.chunkEn） */
const HW_EN: Map<string, string> = new Map()
for (const w of hskWords) {
  const e = w.english || w.fullEnglish
  if (e) HW_EN.set(w.hanzi, e)
}

export function getChunkEns(chunks: string[], dict?: Record<string, string>): string[] {
  const res: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    const chParts = (chunks[i] || '').trim().split(/\s+/).filter(Boolean)
    const ens: string[] = []
    for (const p of chParts) {
      let e = ''
      const d = dict?.[p]
      if (d && d.includes('/')) e = d.split('/')[1].trim()
      if (!e) e = HW_EN.get(p) || ''
      if (e) ens.push(e)
    }
    res.push(ens.join(' '))
  }
  return res
}
