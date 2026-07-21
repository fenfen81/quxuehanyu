# 趣学汉语 — 网站编写思路与分段逻辑总览（定稿）

> 本文档记录网站的整体编写思路与分段逻辑的最终定稿状态，是跨会话的长期架构参考。
> 最后更新：2026-07-20（逐词英文修复 `7ccfc872` 提交后定稿）

---

## 一、项目定位与编写思路

### 1.1 定位
- 面向外国学生的**汉语游戏化学习平台**，对标"句游英语/哇学社"模式，学科为汉语。
- 三大核心练习模式闭环（覆盖"输入→输出→听辨"）：**拖拽拼句 → 看英打中 → 听力听写**。

### 1.2 教学对象与设计约束
- 大学二年级留学生（CET-4 词汇不足、记不住单词）。
- UI 必须适配**课堂投影**：浅蓝背景、卡片式布局、清晰大字体、高对比。

### 1.3 教材分类体系（数据层用教材 id 区分）
- 综合汉语（如《汉语教程》第一册上/下）
- HSK 考试类（HSK 标准教程 1–6）
- 口语类
- 中文 + 职业技能类

### 1.4 技术栈（已定稿，非 Next.js）
- React 19 + Vite + TypeScript（严格 `tsc -b` 是 Vercel 构建门禁）
- Tailwind CSS + shadcn/ui
- 状态：Zustand（XP/等级/连击/错词本 → localStorage 持久化）
- 笔顺：HanziWriter 3.x（本地数据，`dataPath='/hanzi-data'`）
- 拖拽：HTML5 原生 Drag & Drop（不用 @dnd-kit，避免跨列表冲突）
- TTS：预生成 MP3（msedge-tts / XiaoxiaoNeural）+ `Audio.play()`，回退 Web Speech API（仅苹果可靠）
- i18n：自建轻量系统（translations.ts + useLang.ts），全站中英双语
- Node 脚本统一用 `.cjs`（package.json 配 `type:module`）

---

## 二、数据模型

### 2.1 Sentence 结构（`src/data/content.ts`）
```
{
  id:    string                    // 教材内唯一，决定分段模式
  cn:    string                    // 整句汉字
  split: string                    // 分词，空格分隔，如 "你 学 英语 吗"
  en:    string                    // 整句英文
  dict:  Record<string,string>     // 词→"拼音 / 英文"，如 "你": "nǐ / you"
  chunkEn?: string[]               // 【HSK5 专属】意群分段后的逐段英文，与 chunkSentence 输出 1:1 对齐
}
```
- `dict` 值格式固定 `"拼音 / 英文"`，取纯英文用 `dict[w].split(' / ').pop()`。
- `chunkEn` 仅 HSK5 句子存在，由人工/语料对齐生成，顺序与 `chunkSentence` 输出一致。

### 2.2 id 命名规则（教材隔离核心）
- 教材 textbook id 是 `hsk-standard-5`（注意不是 `hsk5-`）。
- **句子 id 用 `hsk5-` 前缀**（如 `hsk5-l7n1`），这是判定"是否走意群分段"的唯一依据。
- 汉语教程、HSK1-4 的句子 id 前缀各异（如 `l3t2s5`、`hsk1-...`），一律走逐词分词。

---

## 三、分段逻辑（核心，已定稿）

### 3.1 总原则：教材隔离，两套模式并存
> **只有 HSK5（上）走"意群分段 + 分段英文"；其余教材（汉语教程、HSK1-4）退回"逐词分词 + 每词英文"。**

判定代码（三处必须一致）：
```ts
const isHsk5 = sentence.id.startsWith('hsk5-')
const chunks = isHsk5
  ? chunkSentence(sentence.cn, sentence.split)   // 意群分段
  : sentence.split.split(/\s+/).filter(Boolean)  // 逐词分词
```

### 3.2 模式 A：汉语教程 / HSK1-4（逐词分词）
- 直接 `split.split(/\s+/)`，每个"词"= 原始生词卡（你 / 学 / 英语 / 吗）。
- 拼句、打字、听写三模式共用同一分词。
- **英文显示**（2026-07-20 最终确认"纯英文版"）：打字模式分段阶段每词显示该词自身英文 `dict[词].split(' / ').pop()`；听写模式分段阶段同样显示该词英文。整句阶段统一显示 `sentence.en`。

### 3.3 模式 B：HSK5（上）（意群分段）
- 走 `chunkSentence(cn, split)`，按**对外汉语教学法意群**切分（见 3.4）。
- 英文显示：分段阶段用 `sentence.chunkEn[chunkIdx]`（人工对齐分段英文）；整句阶段用 `sentence.en`。

### 3.4 chunkSentence 算法（v3，HSK5 专用）
位于 `src/utils/chunkSentence.ts`，输入 `split` 分词结果，产出意群碎片：

**预处理**：剔除所有标点 token；短句（≤10 字且无逻辑虚词）→ 整体不拆，返回 1 块。

**分句**：先按标点把整句断成若干分句（clause）。

**分句内 chunkClause 切分**：
1. **连接词 CONN 强制独立成碎片**：但是/但/可是/然而/所以/因此/而且/并且/于是/不过/否则/那么/随后/然后/接着/因为/由于/如果/虽然/只要/只有/不论/无论/为了/除了/即使/…/而/又/和/与/同 等。
2. **介词 PREP 独立并抓取完整介词短语**：为/给/向/跟/从/比/往/朝/替/由/距/离/在/到/把/被/对于/关于/将。抓取直到下一个 谓语/主语/连接词/标点/否定词；中段出现代词判为新主语则停止；最多抓 8 词。
   - 特例：`从+不` 不抓取（"从不"留内容段）；**`对` 不列入介词**（避免误断"一对夫妻"）。
3. **能愿动词 MODAL 前切出 主语|谓语**：想/要/会/能/可以/应该/愿意/喜欢/希望/打算/准备/决定/开始/继续/…（出现时其前 flush）。
4. 动词集 VERB/VERB2 用于 `findSafeCut` 找安全切面。

**控制阶段 controlFrags**：
- 超长碎片（> MAX_CHUNK=14 字）兜底切。
- 孤立单字非保护碎片 → 并入相邻非保护碎片（`mergeTiny`）。
- **块数梯度 targetRange**（按总汉字数）：≤10 字→[1,1]；11–25 字→[3,6]；≥26 字→[5,12]。块太多合并最短相邻内容碎片，太少拆分最长内容碎片。
- **安全切分约束**：切面不紧贴"的"（保持 修饰+的+中心词 完整），两侧均 ≥2 字；找不到安全点宁可少切块也不破坏意群。

**配套英文**：`getChunkEns(chunks, dict)` 为向后兼容从 dict 拼英文；**UI 现优先用 `sentence.chunkEn`**（HSK5 人工对齐版）。

### 3.5 必须保持三处一致（血泪教训）
分段逻辑存在于三处，改一处必须同步三处，否则显示与音频错位：
1. `src/components/practice/DragPractice.tsx`（拼句）
2. `src/components/practice/ChunkedTypePractice.tsx`（打字/听写，英文逻辑在 `:131`）
3. `app/gen_sentence_audio.cjs`（分段语音生成）

---

## 四、音频系统（句子 + 分段对位）

### 4.1 文件约定
- 整句：`public/audio/{sentenceId}.mp3`（内容只取决于 cn，与切分无关）
- 分段：`public/audio/{sentenceId}-c{n}.mp3`（仅 chunks>1 时生成，n 从 0 起）
- 单词：`public/audio/l{课号}-w{词号}.mp3`（教材生词）、`w-*.mp3`（HSK 词，hash 命名）

### 4.2 播放
- `useTTS.speakChunk(id, idx)` 播 `{id}-c{idx}.mp3`，缺失 → `onerror` 回退（`new Audio('./audio/${id}.mp3')`）。
- 打字/听写分段阶段播当前段，整句阶段播整句。
- 安卓 `speechSynthesis` 在 useEffect/setTimeout 被静默丢弃，统一用预生成 MP3 + `Audio.play()`。

### 4.3 生成脚本教材感知（`gen_sentence_audio.cjs`）
- 删除阶段：`hsk5-` 的 -c 保留（已对齐 1760 段）；非 HSK5 旧意群 -c 删除重建为逐词。
- `RESUME_SEG=1` 续跑：跳过已生成的非 HSK5 逐词 -c，仅补齐缺失（解决每次重跑被清空问题）。
- 分段文本同步走 `isH5 ? chunkSentence : split.split(/\s+/)`。

---

## 五、已实现功能清单（精简）
- 拖拽拼句 / 看英打中 / 听力听写（sentence-level）
- 笔顺查词弹窗（HanziWriter 本地数据）
- 单词朗读（MP3 优先 + Web Speech 回退，可开关自动朗读）
- XP/等级/连击/完成数（localStorage 持久化）
- 侧边栏导航（PC 固定 / 移动端抽屉 + 底部导航）
- 背单词模块（翻转词卡 + 四选一测验，HSK1-6 共 5001 词；支持按教材三级钻取）
- 错词本（测验+打字答错自动收录，可查看/移除/专项复习）
- 进度仪表盘 + 学习计划系统（选级别 + 每日目标 + 预计天数）
- HSK3-6 真实例句（curated JSON 导入，genExample 优先级查询）
- 全站中英双语 i18n

---

## 六、部署与 DevOps
- 仓库 `github.com/fenfen81/quxuehanyu`；Vercel 项目 `quxuehanyu`（GitHub 集成自动部署）。
- 自定义域名 `www.quxuehanyu.com`（阿里云 DNS：A `@`→216.198.79.1，CNAME `www`→*.vercel-dns-017.com），主域 308 跳 www，自动 SSL。
- 推送：`git config --global http.proxy http://127.0.0.1:7892`（需爆猫 VPN 开），推后可 `unset`。
- Vercel 构建 `tsc -b && vite build`；本地手动 `npx tsc -b --noEmit` 验证。
- 当前领先 origin/main 1 个提交 `7ccfc872`（逐词英文修复）待推送。

---

## 七、关键坑与教训
1. **chunkSentence 全局误伤**：未判断教材直接套用，曾切碎汉语教程/HSK1 逐词分词 → 加 `isHsk5` 门控，原则"只有 HSK5 才走意群分段"。
2. **显示与音频必须同步**：改分段显示后旧 -c 音频错位 → 音频脚本同步教材感知 + `RESUME_SEG` 续跑。
3. **dict 值格式**固定 `"拼音 / 英文"`，取英文用 `.split(' / ').pop()`。
4. **TS 严格模式**：TS2590（union 过复杂，HskWord.level 改 number）、TS6133/TS1117/TS2345/TS2551。
5. **esbuild 踩坑**：源码勿放超长 base64 data URI（>1KB），否则 "Unterminated string literal" 构建失败。
6. **安卓 speechSynthesis 在 useEffect/setTimeout 被丢弃** → 唯一可靠方案预生成 MP3 + Audio.play()。
7. **Node 替代 Python**：沙盒有时拦截 Python 文件操作，Node fs 更可靠。
8. **后台任务约 2 分钟上限**；前台长 timeout（如 580000）可绕过。
