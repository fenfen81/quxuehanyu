# 句游汉语 - 课文内容批量导入指南

## 概述

`import_content.py` 脚本提供以下功能：

| 命令 | 用途 |
|------|------|
| `batch-html` | 从 HTML demo 文件批量提取并导入课文数据 |
| `import-json` | 从 JSON 文件导入新课 |
| `extract-html` | 从单个 HTML 文件提取数据（输出 JSON） |
| `create-template` | 创建 JSON 导入模板 |
| `download-strokes` | 自动下载缺失的汉字笔顺数据 |

---

## 方式一：从 HTML demo 批量导入

适用于你已有的 `.html` 格式练习文件。

### 步骤

```bash
cd app目录

# 1. 将同一教材的 HTML 文件放在同一目录下
# 2. 运行导入命令
python import_content.py batch-html <HTML文件目录> \
  --textbook-id "教材ID" \
  --textbook-title "教材中文名" \
  --textbook-title-en "English Title" \
  --category comprehensive \
  --level 初级
```

### 示例

```bash
# 导入《汉语教程》第一册（下）
python import_content.py batch-html "D:/教学资料/下册" \
  --textbook-id "hanyu-jiaocheng-1b" \
  --textbook-title "《汉语教程》第一册（下）" \
  --textbook-title-en "Chinese Course Vol.1B" \
  --category comprehensive \
  --level 初级
```

### 分类选项 (`--category`)

| 值 | 分类名 |
|----|--------|
| `comprehensive` | 综合汉语 |
| `hsk` | HSK 考试类 |
| `oral` | 口语类 |
| `vocational` | 中文+职业技能 |

### 注意

- 脚本自动从 HTML 文件名中提取课号（如 `第21课` → 课号 21）
- 同一教材 ID 下，已有课程不会重复导入，新增课程会自动追加
- 课号按数字顺序排序

---

## 方式二：从 JSON 文件导入

适用于手动编写新课内容。

### 步骤 1：创建模板

```bash
python import_content.py create-template my-lesson.json
```

### 步骤 2：编辑 JSON 文件

```json
{
  "textbookId": "hanyu-jiaocheng-1b",
  "textbookTitle": "《汉语教程》第一册（下）",
  "textbookTitleEn": "Chinese Course Vol.1B",
  "categoryId": "comprehensive",
  "level": "初级",
  "lessons": [
    {
      "lessonId": "lesson23",
      "lessonTitle": "第二十三课",
      "lessonTitleEn": "Lesson 23",
      "texts": [
        {
          "textId": "lesson23-text1",
          "label": "课文一：我学习汉语",
          "sentences": [
            {
              "cn": "我来中国学习汉语。",
              "split": "我 来 中国 学习 汉语",
              "en": "I came to China to study Chinese.",
              "dict": {
                "我": "wǒ / I",
                "来": "lái / come",
                "中国": "Zhōngguó / China",
                "学习": "xuéxí / study",
                "汉语": "Hànyǔ / Chinese language"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

### 字段说明

| 字段 | 说明 | 示例 |
|------|------|------|
| `textbookId` | 教材唯一标识 | `hanyu-jiaocheng-1b` |
| `categoryId` | 分类（见上方分类选项） | `comprehensive` |
| `lessonId` | 课程 ID | `lesson23` |
| `textId` | 课文 ID | `lesson23-text1` |
| `label` | 课文显示名 | `课文一：我学习汉语` |
| `cn` | 中文原句 | `我来中国学习汉语。` |
| `split` | 词语分词（空格分隔） | `我 来 中国 学习 汉语` |
| `en` | 英文翻译 | `I came to China to study Chinese.` |
| `dict` | 词语字典（键=词，值=拼音/释义） | `{"我": "wǒ / I"}` |

### 步骤 3：执行导入

```bash
python import_content.py import-json my-lesson.json
```

---

## 下载笔顺数据

导入新课后，需要下载对应的汉字笔顺数据：

```bash
# 确保已安装 hanzi-writer-data 包
npm install hanzi-writer-data --no-save

# 下载缺失的笔顺数据
python import_content.py download-strokes
```

---

## 完整工作流

```
1. 准备课文数据（HTML 或 JSON 格式）
2. 运行批量导入
3. 下载笔顺数据
4. 构建项目：npx vite build
5. 预览：npx vite preview --port 4173
```

---

## 常见问题

**Q: 导入后网站看不到新内容？**
A: 需要 `npx vite build` 重新构建，然后 `npx vite preview --port 4173` 启动服务器。

**Q: 某些字的笔顺不显示？**
A: 运行 `python import_content.py download-strokes` 下载缺失数据。少数罕见字可能在 hanzi-writer-data 包中不存在。

**Q: 如何添加新教材？**
A: 使用不同的 `--textbook-id` 运行 `batch-html` 或 `import-json`，会自动追加到 content.ts。

**Q: dict 中拼音/释义的格式？**
A: `"词语": "拼音 / 英文释义"`，斜杠两侧有空格。如 `"学习": "xuéxí / study"`。
