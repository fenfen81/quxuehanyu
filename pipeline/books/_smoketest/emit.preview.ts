// ===== DRY-RUN 预览：_smoketest 将插入 content.ts 的 textbooks 数组 =====
{
  id: '_smoketest',
  categoryId: 'comprehensive',
  title: "（测试）示例教材",
  titleEn: "Smoke Test",
  level: '初级',
  lessons: [
    {
      id: 'lesson1',
      title: '第1课',
      titleEn: 'Lesson 1',
      texts: [
        {
          id: 'smk-l1-t1',
          label: "课文一：测试",
          sentences: [
            {
              id: 'smk-l1-t1-s1',
              cn: "你好！",
              split: "你好",
              en: "Hello!"
            dict: {
              "你好": "nǐ hǎo / hello",
            }
            },
            {
              id: 'smk-l1-t1-s2',
              cn: "我学习汉语。",
              split: "我 学习 汉语",
              en: "I study Chinese."
            dict: {
              "我": "wǒ / I",
              "学习": "xué xí / study; learn",
              "汉语": "hàn yǔ / Chinese language",
            }
            }
          ]
        }
      ]
    }
  ]
},

// ===== DRY-RUN 预览：_smoketest 将插入 textbookDict.ts 的 textbookVocabList 数组 =====
{
  textbookId: '_smoketest',
  title: '（测试）示例教材',
  titleEn: 'Smoke Test',
  categoryId: 'comprehensive',
  lessons: [
    {
      lessonId: 'lesson1',
      lessonNum: 1,
      lessonTitle: '第一课 测试',
      lessonTitleEn: 'Lesson 1',
      words: [
        {
          id: 'smk-l1-w1',
          hanzi: '你',
          pinyin: 'nǐ',
          pos: '代',
          english: 'you',
          exampleCn: '你好！',
          exampleEn: 'Hello!',
          examplePinyin: 'Nǐ hǎo'
        },
        {
          id: 'smk-l1-w2',
          hanzi: '学习',
          pinyin: 'xué xí',
          pos: '动',
          english: 'study; learn',
          exampleCn: '我学习汉语。',
          exampleEn: 'I study Chinese.',
          examplePinyin: 'Wǒ xué xí hàn yǔ'
        }
      ]
    }
  ]
},
