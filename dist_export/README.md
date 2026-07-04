# 趣学汉语 - 游戏化汉语学习网站

## 项目说明
面向外国学生的汉语游戏化学习平台，包含课文拼句、听写、打字练习、HSK 背单词等功能。

## 目录结构

```
趣学汉语/
├── index.html                  # 入口 HTML（直接用浏览器打开即可运行）
├── hanzi-writer.min.js         # 汉字笔顺绘制库（本地）
├── assets/
│   ├── index-*.js              # 主程序（原生 JS，无 JSX/TypeScript）
│   └── index-*.css             # 样式表（原生 CSS，含 Tailwind 编译输出）
├── hanzi-data/                 # 汉字笔顺数据（9574 个 JSON 文件）
│   ├── 我.json
│   ├── 你.json
│   └── ...
└── audio/                      # 课文音频（928 个 MP3 文件）
    ├── l10t1s1.mp3
    └── ...
```

## 运行方式

### 方式一：直接打开（最简单）
双击 `index.html` 即可在浏览器中运行。

### 方式二：本地服务器（推荐）
```bash
# 方式 A：Python
python -m http.server 8080

# 方式 B：Node.js
npx serve .

# 方式 C：VS Code
# 安装 Live Server 插件 → 右键 index.html → Open with Live Server
```

### 方式三：HBuilder
1. 将整个文件夹拖入 HBuilder
2. 右键 `index.html` → 运行 → 运行到浏览器

## 技术说明
- 所有代码已编译为标准原生 HTML / CSS / JavaScript
- 无 JSX、TypeScript、import/export 等 build-time 语法
- 全部使用相对路径（`./`），可离线运行
- 可在 VS Code、HBuilder、WebStorm 等任意前端开发环境打开编辑

## 功能模块
| 模块 | 说明 |
|------|------|
| 首页 | 品牌展示、功能入口 |
| 练句子 | 拖拽拼句 / 打字练习 / 听写练习（含音效、TTS 朗读） |
| 背单词 | HSK 1-6 词库（5001 词），翻转词卡 / 四选一测验 / 打字模式 |
| 分类课程 | 综合汉语、HSK 考试、口语、职业技能 |
