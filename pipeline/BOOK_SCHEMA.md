# 教材导入流水线 · 数据契约与用法

本流水线把「扫描版 PDF 教材 → 网站可上线的课文 + 生词数据」自动化。

```
PDF(扫描版)
  └─ 01_extract_pages.py   拆页成 JPG（已就绪）
        └─ books/<bookId>/pages/pNNN.jpg
  ② AI 读图 → book.json   ← 本会话模型看不到图，见下方「读图这一步」
        └─ books/<bookId>/book.json
  ③ 03_enrich.cjs          机械补全（拼音/分词/id/dict/例句拼音）
        └─ books/<bookId>/book.enriched.json
  ④ 04_validate.cjs         校验完整性
  ⑤ 05_emit.cjs            精准插入 content.ts(课文) + textbookDict.ts(生词)
  ⑥ 06_audio.cjs           生成 edge-tts 语音（句子/整词/例句）
  run.cjs                  一键串起 ③④⑤（可选 ⑥）
```

---

## 关于「读图这一步」（重要）

当前会话的 AI 模型**无法直接读取扫描图片**。但本模型**可以读取文本**。
因此推荐的自动化路径是：

1. **用任意 OCR 把 PDF 转成文本**（你的手机/Adobe/在线 OCR/扫描仪均可），或
2. **在支持多模态的会话里**让 AI 直接产出 `book.json`（最省事），或
3. 你把每课的**中文原文贴给我**，我（AI）负责补英文翻译、词性、例句英文，
   并生成符合契约的 `book.json`。

拿到文本后，剩下的 ③④⑤⑥ 全部由脚本自动完成，无需你再动手。

> 已提供 `02_ocr.py`：若环境装了 `paddleocr`/`easyocr`，可一键 OCR 出
> `book.ocr.txt` 供你/AI 结构化。未安装则打印提示，不影响其它步骤。

---

## book.json 契约（AI 读图这一步的产物）

路径：`pipeline/books/<bookId>/book.json`

```jsonc
{
  "textbookId": "hanyu-jiaocheng-2a",   // 全局唯一，建议与目录名一致
  "bookCode": "hj2a",                    // 短前缀，用于生成全局唯一的音频 id（避免和 1a 的 l1-w1 撞车）
  "title": "《汉语教程》第二册（上）",
  "titleEn": "Chinese Course Vol.2A",
  "categoryId": "comprehensive",         // comprehensive | hsk | oral | vocational
  "level": "初级",
  "lessons": [
    {
      "lessonNum": 1,
      "lessonTitle": "第一课 你好",
      "lessonTitleEn": "Lesson 1",
      "texts": [
        {
          "label": "课文一：你好",
          "sentences": [
            {
              "cn": "你好！",
              "en": "Hello!",
              "dict": { "你好": "hello" }     // 词 → 英文释义（拼音由 enrich 自动补）
            }
          ]
        }
      ],
      "words": [
        {
          "hanzi": "你",
          "pos": "代",
          "english": "you（单数）",
          "exampleCn": "你好！",
          "exampleEn": "Hello to you!"
        }
      ]
    }
  ]
}
```

### AI 只需提供的内容（无法机械推导）
- 句子：`cn`（中文）、`en`（英文翻译）、`dict`（每个词 → 英文释义）
- 生词：`hanzi`、`pos`（词性）、`english`、`exampleCn`、`exampleEn`

### enrich 脚本自动补全（机械可推导）
- 句子 `split`：用 `pinyin-pro` 逐词分词（汉语教程走 word-level）
- 句子 `dict` 值：拼成 `"拼音 / 英文"` 格式
- 句子/生词 `id`：`<bookCode>-l{课}-t{课文}-s{句}` / `<bookCode>-l{课}-w{词}`
- 生词 `pinyin`、`examplePinyin`：由 `pinyin-pro` 生成

---

## 用法

```bash
cd app

# ① 拆页（已做完可跳过；支持断点续跑）
python pipeline/01_extract_pages.py "C:/Users/Lenovo/Desktop/汉语教程 第二册-上.pdf" hanyu-jiaocheng-2a

# ② 产出 book.json（见上方说明），放到 pipeline/books/hanyu-jiaocheng-2a/book.json

# ③ 机械补全
node pipeline/03_enrich.cjs hanyu-jiaocheng-2a

# ④ 校验（有错误会非零退出）
node pipeline/04_validate.cjs hanyu-jiaocheng-2a

# ⑤ 写入数据文件（默认先 --dry-run 预览）
node pipeline/05_emit.cjs hanyu-jiaocheng-2a --dry-run
node pipeline/05_emit.cjs hanyu-jiaocheng-2a          # 真正写入

# ⑥ 生成语音（需联网调用 Edge TTS）
node pipeline/06_audio.cjs hanyu-jiaocheng-2a

# 或一键：enrich → validate → emit →（可选 audio）
node pipeline/run.cjs hanyu-jiaocheng-2a --audio
```

## 设计要点
- **精准插入，不整体覆盖**：`05_emit.cjs` 用括号匹配只把新教材对象塞进
  `textbooks` / `textbookVocabList` 数组，绝不重写整个文件，已有教材（如 1a）不受影响。
- **全局唯一 id**：用 `bookCode` 前缀（如 `hj2a-l1-w1`），避免音频文件名与
  1a 的 `l1-w1.mp3` 互相覆盖导致串音。
- **幂等**：`enrich`/`emit`/`audio` 都可重复运行；`emit` 检测到已导入会跳过
  （`--force` 覆盖）；`audio` 跳过已存在且体积正常的 mp3。
- **idempotent & safe**：`emit` 支持 `--dry-run` 只预览生成的 TS，不改任何文件。

---

## 验证与排错

完成 emit 后，强烈建议先验证再提交：

```bash
# 内存级语法校验：用 esbuild 检查 05_emit 生成的字面量（含特殊字符/换行/空 dict 压力用例）
node pipeline/_verify.cjs

# 真实类型检查（Vercel 构建门禁）
cd app && npx tsc -b --noEmit
```

常见报错与对策：
- **`Expected } but found dict`（TS1005）**：`05_emit.cjs` 的 `genSentence` 里 `en` 字段后漏了逗号再接 `dict`。已修复（`en` 行末尾恒带 `,`）。若再出现，先看 emit 出的字面量是否每个属性间都有逗号。
- **`EMIT_ROOT` 测试不污染真实数据**：`EMIT_ROOT=/tmp/emit_test node pipeline/05_emit.cjs <bookId>`，临时目录里放 `src/data/content.ts` 与 `textbookDict.ts` 的副本即可，emit 只写进临时目录。
- **`require('./05_emit.cjs')` 直接退出**：05_emit 的 book 加载/argv 解析已包在 `if (require.main === module)` 内；若仍退出，检查是否被其它脚本在模块顶层调用了 `process.exit`。
- **`categoryId` 非法的 tsc 报错**：content.ts 的 `Textbook.categoryId` 是联合类型 `'comprehensive'|'hsk'|'oral'|'vocational'`，book.json 必须填其中之一（textbookDict.ts 的 `TextbookVocab.categoryId` 只要求 string，无此限制）。
- **句子练习页不出现「背本课生词」**：vocab 的 `lessonId` 必须与 content.ts 里对应课的 id 一致（详见 `add-textbook-vocab` 技能）。

