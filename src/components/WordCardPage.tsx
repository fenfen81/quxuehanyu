import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { hskWordsByLevel, hskWords } from '../data/hskWords'
import type { HskWord } from '../data/hskWords'
import { genExample } from '../data/examples'
import { textbookVocabList } from '../data/textbookDict'
import type { TextbookWord } from '../data/textbookDict'
import { sfx } from '../utils/sfx'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'
import { useLang } from '@/i18n/useLang'
import { categories } from '../data/content'

// ── 教材生词 → HskWord 适配器 ──
function textbookWordToHskWord(w: TextbookWord): HskWord {
  return { id: w.id, hanzi: w.hanzi, pinyin: w.pinyin, english: w.english, fullEnglish: w.english, pos: w.pos, posCn: '', level: 1, emoji: '📘' }
}

// 教材生词例句查找
const tbExampleMap = new Map<string, { cn: string; en: string }>()
for (const tb of textbookVocabList) {
  for (const lesson of tb.lessons) {
    for (const w of lesson.words) {
      tbExampleMap.set(w.id, { cn: w.exampleCn, en: w.exampleEn })
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  TTS — 优先播放预生成 MP3（安卓兼容），回退到 speechSynthesis
// ══════════════════════════════════════════════════════════════════════════════
let audioUnlocked = false

/** 安全获取 speechSynthesis */
function getSynth(): SpeechSynthesis | null {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis
    }
  } catch {}
  return null
}

function getZhVoice(): SpeechSynthesisVoice | null {
  const synth = getSynth()
  if (!synth) return null
  try {
    const voices = synth.getVoices()
    return voices.find(v => v.lang === 'zh-CN') || voices.find(v => v.lang.startsWith('zh')) || null
  } catch {}
  return null
}

/** 解锁音频播放（安卓要求首次用户手势触发 Audio/speechSynthesis） */
/** 解锁音频播放（安卓要求首次用户手势触发 Audio/speechSynthesis） */
function unlockAudio() {
  if (audioUnlocked) return
  // 播放静音WAV来解锁 Audio API（安卓兼容）
  try {
    const silent = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=')
    silent.volume = 0
    silent.play().then(() => { audioUnlocked = true }).catch(() => {})
  } catch {}
  // 同时解锁 speechSynthesis 作为 fallback
  const synth = getSynth()
  if (synth) {
    try {
      const u = new SpeechSynthesisUtterance(' ')
      u.volume = 0
      synth.speak(u)
    } catch {}
  }
}


// Audio 缓存
const wordAudioCache = new Map<string, HTMLAudioElement>()
let currentWordAudio: HTMLAudioElement | null = null

/** 朗读中文单词：优先播放预生成 MP3，回退到 speechSynthesis */
function speakWord(text: string, wordId?: string) {
  // 停止当前播放
  if (currentWordAudio) {
    currentWordAudio.pause()
    currentWordAudio.currentTime = 0
    currentWordAudio = null
  }
  const synth = getSynth()
  if (synth) { try { synth.cancel() } catch {} }

  // 优先播放预生成 MP3（安卓兼容，Audio.play() 在用户手势解锁后可自动播放）
  if (wordId) {
    const cached = wordAudioCache.get(wordId)
    if (cached) {
      currentWordAudio = cached
      cached.currentTime = 0
      cached.play().catch(() => {
        // MP3 播放失败，回退到 speechSynthesis
        speakWithSynth(text)
      })
      return
    }
    // 动态加载
    const audio = new Audio(`./audio-words/${wordId}.mp3`)
    audio.preload = 'auto'
    wordAudioCache.set(wordId, audio)
    currentWordAudio = audio
    audio.currentTime = 0
    audio.play().catch(() => {
      // MP3 播放失败，回退到 speechSynthesis
      speakWithSynth(text)
    })
    return
  }

  // 没有 wordId，直接用 speechSynthesis
  speakWithSynth(text)
}

/** speechSynthesis 回退方案 */
function speakWithSynth(text: string) {
  const synth = getSynth()
  if (!synth) return
  try {
    if (synth.paused) synth.resume()
    synth.cancel()
    setTimeout(() => {
      try {
        if (synth.paused) synth.resume()
        const u = new SpeechSynthesisUtterance(text)
        const v = getZhVoice()
        if (v) u.voice = v
        u.lang = 'zh-CN'
        u.rate = 0.85
        u.volume = 1
        synth.speak(u)
      } catch {}
    }, 80)
  } catch {}
}

function SpeakBtn({ text, wordId, className = '' }: { text: string; wordId?: string; className?: string }) {
  const [playing, setPlaying] = useState(false)
  const { lang } = useLang()
  const speakTitle = t('words_tap_speak', lang)
  return (
    <button onClick={(e) => { e.stopPropagation(); unlockAudio(); speakWord(text, wordId); setPlaying(true); setTimeout(() => setPlaying(false), 1500); sfx.play('click') }}
            className={`inline-flex items-center justify-center rounded-full transition-all duration-150 hover:scale-110 active:scale-95 ${playing ? 'animate-pulse' : ''} ${className}`}
            title={speakTitle} aria-label={speakTitle}>
      {playing ? '🔊' : '🔈'}
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  工具函数
// ══════════════════════════════════════════════════════════════════════════════
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
function pickDistractors(correct: HskWord, pool: HskWord[], n = 3): HskWord[] {
  // ── 准备正确答案的特征 ──
  const correctChars = new Set(correct.hanzi.split(''))
  const stopWords = new Set(['the','to','of','and','for','in','a','an','is','are','be','will','can','not','no','it','as','at','by','on','or'])
  const correctEngWords = new Set(
    correct.english.toLowerCase()
      .split(/[\s,;()\/]+/)
      .filter(x => x.length > 2 && !stopWords.has(x))
  )

  // ── 为每个候选词打分（分数越高 = 越容易混淆 = 越好的干扰项）──
  const scored = pool
    .filter(w => w.id !== correct.id)
    .map(w => {
      let score = 0
      // ① 词性相同：+3（最强权重，同词性最容易混淆）
      if (correct.pos && w.pos === correct.pos) score += 3
      // ② 含共同汉字：+2/字（视觉相似性，如"学习"vs"学生"，最多+4）
      const sharedChars = [...new Set(w.hanzi.split(''))].filter(c => correctChars.has(c)).length
      score += Math.min(sharedChars * 2, 4)
      // ③ 英文释义含相同词：+3/词（语义相似性，如"to love"vs"to like"，最多+6）
      const wEngWords = w.english.toLowerCase()
        .split(/[\s,;()\/]+/)
        .filter(x => x.length > 2 && !stopWords.has(x))
      const sharedEng = wEngWords.filter(word => correctEngWords.has(word)).length
      score += Math.min(sharedEng * 3, 6)
      // ④ 字数相近（±1字）：+1（长度相近更难区分）
      if (Math.abs(w.hanzi.length - correct.hanzi.length) <= 1) score += 1
      // ⑤ 微量随机扰动：保证同一道题每次出的干扰项不完全一样
      score += Math.random() * 1.5
      return { word: w, score }
    })
    .sort((a, b) => b.score - a.score)

  // ── 从高分候选池中随机抽取 n 个 ──
  const topPool = scored.slice(0, Math.min(n * 3, scored.length))
  return shuffle(topPool.map(s => s.word)).slice(0, n)
}
function todayStr(): string { return new Date().toISOString().slice(0, 10) }

// ══════════════════════════════════════════════════════════════════════════════
//  学习计划 数据模型 & 持久化
// ══════════════════════════════════════════════════════════════════════════════
interface StudyPlan {
  level: 1|2|3|4|5|6; dailyGoal: number; startedAt: string
  learnedIds: string[]; reviewIds: string[]
  dailyLog: Record<string, { learned: number; reviewed: number }>
}
const DEFAULT_PLAN: StudyPlan = { level: 1, dailyGoal: 30, startedAt: todayStr(), learnedIds: [], reviewIds: [], dailyLog: {} }
const PLAN_KEY = 'quxue-study-plan'
function loadPlan(): StudyPlan { try { const r = localStorage.getItem(PLAN_KEY); if (r) return JSON.parse(r) } catch {} return { ...DEFAULT_PLAN } }
function savePlan(p: StudyPlan) { localStorage.setItem(PLAN_KEY, JSON.stringify(p)) }

type Mode = 'flashcard' | 'quiz' | 'type'
type View = 'chooseMode' | 'dashboard' | 'textbookSelect' | 'learning' | 'search'
type VocabMode = 'hsk' | 'textbook'
type TextbookStep = 'category' | 'textbook' | 'lesson'
type TypeHintMode = 'english' | 'pinyin'

interface Props { onXP?: (pts: number) => void; onWrongWord?: (word: HskWord) => void; wrongWords?: HskWord[]; onRemoveWrongWord?: (id: string) => void; lang?: Lang }

// ── 收藏功能 localStorage ──
const FAV_KEY = 'qx_fav_words'
function loadFavs(): string[] { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]') } catch { return [] } }
function toggleFav(id: string): string[] {
  const list = loadFavs()
  const i = list.indexOf(id)
  if (i >= 0) list.splice(i, 1); else list.push(id)
  localStorage.setItem(FAV_KEY, JSON.stringify(list))
  return list
}

const LEVELS: Array<1|2|3|4|5|6> = [1,2,3,4,5,6]
const WORD_COUNTS: Record<number,number> = {1:150,2:150,3:300,4:600,5:1300,6:2501}
const LEVEL_NAMES: Record<number,string> = { 1:'HSK 1', 2:'HSK 2', 3:'HSK 3', 4:'HSK 4', 5:'HSK 5', 6:'HSK 6' }
const LEVEL_GRADIENTS: Record<number,string> = {
  1:'linear-gradient(135deg,#34d399,#10b981)', 2:'linear-gradient(135deg,#60a5fa,#3b82f6)',
  3:'linear-gradient(135deg,#818cf8,#6366f1)', 4:'linear-gradient(135deg,#a78bfa,#8b5cf6)',
  5:'linear-gradient(135deg,#fb923c,#f97316)', 6:'linear-gradient(135deg,#f87171,#ef4444)',
}
const DAILY_OPTIONS = [15, 30, 50, 100]

export default function WordCardPage({ onXP, onWrongWord, wrongWords = [], onRemoveWrongWord, lang = 'zh' }: Props) {
  const tt = (k: Parameters<typeof t>[0]) => t(k, lang)
  const [vocabMode, setVocabMode] = useState<VocabMode>('hsk')
  const [plan, setPlan] = useState<StudyPlan>(loadPlan)
  const [view, setView]           = useState<View>('chooseMode')
  const [mode, setMode]           = useState<Mode>('flashcard')
  const [showPlanModal, setShowPlanModal]     = useState(false)
  const [autoSpeak, setAutoSpeak]             = useState(true)
  const [showPinyin, setShowPinyin]           = useState(true)
  const [searchQ, setSearchQ]                 = useState('')
  const [searchResults, setSearchResults]     = useState<HskWord[]>([])
  const [showSettings, setShowSettings]       = useState(false)
  const [showWrongBook, setShowWrongBook]     = useState(false)
  const [sfxOn, setSfxOn]                     = useState(sfx.enabled)
  const [sessionQueue, setSessionQueue]       = useState<HskWord[]>([])
  // 教材选择 state
  const [tbStep, setTbStep]                   = useState<TextbookStep>('category')
  const [tbCategoryId, setTbCategoryId]       = useState<string | null>(null)
  const [tbTextbookId, setTbTextbookId]       = useState<string | null>(null)
  const [tbLessonId, setTbLessonId]           = useState<string | null>(null)
  const [tbLearnedLessons, setTbLearnedLessons] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('qx_tb_vocab_progress') || '{}') } catch { return {} }
  })
  const [idx, setIdx]                       = useState(0)
  const [flipped, setFlipped]               = useState(false)
  const [options, setOptions]               = useState<HskWord[]>([])
  const [chosen, setChosen]                 = useState<string | null>(null)
  const [score, setScore]                   = useState({ correct: 0, wrong: 0 })
  const [showResult, setShowResult]         = useState(false)
  // 打字模式 state
  const [typeInput, setTypeInput]           = useState('')
  const [typeHintMode, setTypeHintMode]     = useState<TypeHintMode>('english')
  const [typedCorrect, setTypedCorrect]     = useState<boolean | null>(null)
  const [typeMistakes, setTypeMistakes]     = useState(0)
  const typeInputRef = useRef<HTMLInputElement>(null)
  const touchRef = useRef({ x: 0, y: 0, swiping: false })
  // 收藏
  const [favIds, setFavIds] = useState<string[]>(loadFavs)
  const favSet = useMemo(() => new Set(favIds), [favIds])
  const handleToggleFav = useCallback((id: string) => { setFavIds(toggleFav(id)); sfx.play('click') }, [])

  // 派生数据
  const levelWords = useMemo(() => hskWordsByLevel(plan.level), [plan.level])
  const totalWords = levelWords.length
  const learnedSet = useMemo(() => new Set(plan.learnedIds), [plan.learnedIds])
  const newWordsToLearn = useMemo(
    () => levelWords.filter(w => !learnedSet.has(w.id) && !plan.reviewIds.includes(w.id)),
    [levelWords, learnedSet, plan.reviewIds],
  )
  const progressPct = totalWords > 0 ? Math.round((learnedSet.size / totalWords) * 100) : 0
  const todayLog = plan.dailyLog[todayStr()] || { learned: 0, reviewed: 0 }
  const remainingToday = Math.max(0, plan.dailyGoal - todayLog.learned)
  const daysRemaining = plan.dailyGoal > 0 ? Math.ceil(newWordsToLearn.length / plan.dailyGoal) : 0
  const estimatedFinishDate = (() => { const d = new Date(); d.setDate(d.getDate() + daysRemaining); return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { month:'long', day:'numeric' }) })()

  useEffect(() => { savePlan(plan) }, [plan])
  useEffect(() => { if (autoSpeak && view === 'learning' && !showResult && sessionQueue[idx]) { const t = setTimeout(() => speakWord(sessionQueue[idx].hanzi, sessionQueue[idx].id), 300); return () => clearTimeout(t) } }, [idx, autoSpeak, showResult, view, sessionQueue])
  useEffect(() => { if (!sessionQueue[idx] || mode !== 'quiz' || view !== 'learning') return; const pool = (vocabMode === 'textbook' ? sessionQueue : levelWords).filter(w => w.id !== sessionQueue[idx].id); const distractors = pickDistractors(sessionQueue[idx], pool, 3); setOptions(shuffle([sessionQueue[idx], ...distractors])); setChosen(null) }, [idx, mode, view, sessionQueue, levelWords, vocabMode])
  useEffect(() => { if (!searchQ.trim()) { setSearchResults([]); return }; const q = searchQ.trim().toLowerCase(); setSearchResults(hskWords.filter(w => w.hanzi.includes(q) || w.pinyin.toLowerCase().includes(q) || w.english.toLowerCase().includes(q)).slice(0, 12)) }, [searchQ])
  useEffect(() => { if (mode === 'type' && view === 'learning' && sessionQueue[idx]) { setTypeInput(''); setTypedCorrect(null); setTypeMistakes(0); setTimeout(() => typeInputRef.current?.focus(), 100) } }, [idx, mode, view, sessionQueue])
  useEffect(() => { const warmup = () => { sfx.warmup(); unlockAudio() }; document.addEventListener('click', warmup, { once: true }); document.addEventListener('keydown', warmup, { once: true }); document.addEventListener('touchstart', warmup, { once: true, passive: true }); return () => { document.removeEventListener('click', warmup); document.removeEventListener('keydown', warmup); document.removeEventListener('touchstart', warmup) } }, [])

  // ── 从课文练习页跳转过来时，自动进入教材背单词模式 ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem('qx_tb_vocab_jump')
      if (!raw) return
      const { textbookId, lessonId, ts } = JSON.parse(raw)
      // 5秒内的请求才有效，避免 stale 数据
      if (Date.now() - ts > 5000) { localStorage.removeItem('qx_tb_vocab_jump'); return }
      const tb = textbookVocabList.find(t => t.textbookId === textbookId)
      if (!tb) { localStorage.removeItem('qx_tb_vocab_jump'); return }
      const lesson = tb.lessons.find(l => l.lessonId === lessonId)
      if (!lesson) { localStorage.removeItem('qx_tb_vocab_jump'); return }
      // 清除标记，防止重复触发
      localStorage.removeItem('qx_tb_vocab_jump')
      // 自动进入教材模式 + 开始本课生词
      setVocabMode('textbook')
      setTbTextbookId(textbookId)
      setTbLessonId(lessonId)
      const words = lesson.words.map(textbookWordToHskWord)
      setSessionQueue(words); setIdx(0); setFlipped(false); setChosen(null)
      setScore({ correct: 0, wrong: 0 }); setShowResult(false)
      setView('learning'); setMode('flashcard'); sfx.play('complete')
    } catch {}
  }, [])

  const learnedWords = useMemo(() => levelWords.filter(w => learnedSet.has(w.id)), [levelWords, learnedSet])

  // ── 操作函数 ──────────────────────────────────────────────────────────────
  const startLearningSession = useCallback(() => {
    const reviewPart = plan.reviewIds.map(id => levelWords.find(w => w.id === id)).filter(Boolean) as HskWord[]
    const newPart = newWordsToLearn.slice(0, plan.dailyGoal)
    const target = Math.max(plan.dailyGoal, 20)
    let combined = shuffle([...reviewPart, ...newPart]).slice(0, target)
    // 新词+错词不够时，用已学过的词补齐
    if (combined.length < target) {
      const learnedPart = shuffle(levelWords.filter(w => !combined.some(c => c.id === w.id)))
      combined = [...combined, ...learnedPart].slice(0, target)
    }
    if (combined.length === 0) { combined = shuffle(levelWords).slice(0, target) }
    setSessionQueue(combined); setIdx(0); setFlipped(false); setChosen(null); setScore({ correct: 0, wrong: 0 }); setShowResult(false); setView('learning'); sfx.play('complete')
  }, [plan.reviewIds, plan.dailyGoal, newWordsToLearn, levelWords])

  // 全部复习：从当前级别所有词中随机抽取（含已学+未学）
  const startReviewAllSession = useCallback(() => {
    const target = Math.max(plan.dailyGoal, 20)
    const combined = shuffle(levelWords).slice(0, target)
    setSessionQueue(combined); setIdx(0); setFlipped(false); setChosen(null); setScore({ correct: 0, wrong: 0 }); setShowResult(false); setView('learning'); sfx.play('complete')
  }, [plan.dailyGoal, levelWords])

  // 收藏词汇复习
  const startFavSession = useCallback(() => {
    const favWords = favIds.map(id => hskWords.find(w => w.id === id)).filter(Boolean) as HskWord[]
    if (!favWords.length) { alert(tt('words_no_fav')); return }
    setSessionQueue(shuffle(favWords)); setIdx(0); setFlipped(false); setChosen(null)
    setScore({ correct: 0, wrong: 0 }); setShowResult(false); setView('learning'); setMode('flashcard'); sfx.play('complete')
  }, [favIds])

  const markLearned = useCallback((wordId: string) => {
    setPlan(prev => ({ ...prev, learnedIds: prev.learnedIds.includes(wordId) ? prev.learnedIds : [...prev.learnedIds, wordId], reviewIds: prev.reviewIds.filter(id => id !== wordId), dailyLog: { ...prev.dailyLog, [todayStr()]: { ...(prev.dailyLog[todayStr()]||{learned:0,reviewed:0}), learned:(prev.dailyLog[todayStr()]?.learned||0)+1 } } }))
  }, [])
  const markForReview = useCallback((wordId: string) => {
    setPlan(prev => ({ ...prev, reviewIds: prev.reviewIds.includes(wordId) ? prev.reviewIds : [...prev.reviewIds, wordId], dailyLog: { ...prev.dailyLog, [todayStr()]: { ...(prev.dailyLog[todayStr()]||{learned:0,reviewed:0}), reviewed:(prev.dailyLog[todayStr()]?.reviewd||0)+1 } } }))
  }, [])
  const updatePlan = (patch: Partial<StudyPlan>) => { setPlan(prev => ({ ...prev, ...patch })) }
  const saveNewPlan = (level: 1|2|3|4|5|6, dailyGoal: number) => { updatePlan({ level, dailyGoal, startedAt: plan.startedAt || todayStr() }); setShowPlanModal(false); setView('dashboard'); sfx.play('levelChange') }

  // ── 教材生词学习 ──
  const startTextbookLessonSession = useCallback((textbookId: string, lessonId: string) => {
    const tb = textbookVocabList.find(t => t.textbookId === textbookId)
    if (!tb) return
    const lesson = tb.lessons.find(l => l.lessonId === lessonId)
    if (!lesson || !lesson.words.length) return
    const words = lesson.words.map(textbookWordToHskWord)
    setSessionQueue(words); setIdx(0); setFlipped(false); setChosen(null)
    setScore({ correct: 0, wrong: 0 }); setShowResult(false)
    setView('learning'); setMode('flashcard'); sfx.play('complete')
  }, [])

  const saveTbLessonProgress = useCallback((lessonKey: string, count: number) => {
    setTbLearnedLessons(prev => {
      const next = { ...prev, [lessonKey]: count }
      try { localStorage.setItem('qx_tb_vocab_progress', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const handleAnswer = (word: HskWord) => {
    if (chosen) return; setChosen(word.id); const isCorrect = word.id === sessionQueue[idx].id
    setScore(s => ({ correct: s.correct+(isCorrect?1:0), wrong: s.wrong+(isCorrect?0:1) }))
    if (isCorrect) { if(vocabMode==='hsk')markLearned(sessionQueue[idx].id); onXP?.(10); sfx.play('correct') } else { if(vocabMode==='hsk')markForReview(sessionQueue[idx].id); onWrongWord?.(sessionQueue[idx]); sfx.play('wrong') }
    setTimeout(() => { if(idx+1>=sessionQueue.length){finishSession()} else{setIdx(i=>i+1);setChosen(null)} }, 1000)
  }
  const nextCard = () => { if(idx+1>=sessionQueue.length){finishSession();return}; setIdx(i=>i+1);setFlipped(false);sfx.play('flip') }
  const handleFlashcardNext = () => { if(vocabMode==='hsk')markLearned(sessionQueue[idx].id); nextCard() }

  // 打字模式
  const handleTypeSubmit = () => {
    if (!current || typedCorrect !== null) return
    const input = typeInput.trim(); if (!input) return
    const expected = current.hanzi.replace(/\s/g,''), actual = input.replace(/\s/g,'')
    const isCorrect = expected === actual
    if (isCorrect) { setTypedCorrect(true); if(vocabMode==='hsk')markLearned(current.id); onXP?.(10); sfx.play('correct'); setTimeout(()=>{if(idx+1>=sessionQueue.length){finishSession()}else{setIdx(i=>i+1);sfx.play('flip')}},1200) }
    else { setTypedCorrect(false); setTypeMistakes(m=>m+1); if(vocabMode==='hsk')markForReview(current.id); onWrongWord?.(current); sfx.play('wrong'); setTimeout(()=>{setTypedCorrect(null);setTypeInput('')},800) }
  }
  const handleTypeSkip = () => { if(vocabMode==='hsk')markForReview(sessionQueue[idx].id); if(idx+1>=sessionQueue.length){finishSession();return}; setIdx(i=>i+1); sfx.play('delete') }

  // 完成一轮练习
  const finishSession = () => {
    setShowResult(true)
    if (vocabMode === 'textbook' && tbTextbookId && tbLessonId) {
      const key = `${tbTextbookId}/${tbLessonId}`
      saveTbLessonProgress(key, sessionQueue.length)
    }
  }

  const current = sessionQueue[idx]

  // ═════════ RENDER ═════════
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* 顶部标题 */}
      <header className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-slate-800">📖 {tt('words_title')}</h2><p className="text-sm text-slate-500 mt-0.5">{tt('words_subtitle')}</p></div>
        <div className="flex gap-2">
          {view !== 'chooseMode' && (
            <button onClick={()=>{setView('chooseMode');sfx.play('click')}} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm">← {tt('vocab_back_mode')}</button>
          )}
          {vocabMode === 'hsk' && view !== 'chooseMode' && (
            <>
              <button onClick={startFavSession} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-amber-50 border border-amber-200 text-amber-600 hover:border-amber-400 transition-all shadow-sm" title={tt('words_fav')}>
                ⭐<span className="hidden sm:inline">{tt('words_fav')}</span> {favIds.length > 0 && <span className="bg-amber-500 text-white rounded-full px-1.5 py-0 text-[10px] font-bold">{favIds.length}</span>}
              </button>
              <button onClick={()=>setShowSettings(s=>!s)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all shadow-sm border ${sfxOn?'bg-indigo-50 text-indigo-600 border-indigo-200':'bg-white border-slate-200 text-slate-500'}`} title={tt('words_sfx')}>🔊{sfxOn?'ON':'OFF'}</button>
              <button onClick={() => { setShowPlanModal(true); sfx.play('click') }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm">⚙️ {tt('settings')}</button>
            </>
          )}
        </div>
      </header>

      {/* 音效设置浮层 */}
      {vocabMode === 'hsk' && showSettings && (
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-md animate-fade-in">
          <h4 className="text-sm font-bold text-slate-700 mb-3">⌨️ {tt('words_settings')}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button onClick={()=>{const nv=!sfxOn;sfx.enabled=nv;setSfxOn(nv);if(nv)sfx.play('click')}} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium ${sfxOn?'bg-emerald-50 border-emerald-300 text-emerald-700':'bg-slate-50 border-slate-200 text-slate-500'}`}><span>{tt('words_sfx')}</span><span className={`text-xs font-black px-2 py-0.5 rounded-full ${sfxOn?'bg-emerald-500 text-white':'bg-slate-200 text-slate-400'}`}>{sfxOn?'ON':'OFF'}</span></button>
            <button onClick={() => { setAutoSpeak(a=>!a); sfx.play('click') }} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium ${autoSpeak?'bg-blue-50 border-blue-300 text-blue-700':'bg-slate-50 border-slate-200 text-slate-500'}`}><span>{tt('words_autospeak')}</span><span className={`text-xs font-black px-2 py-0.5 rounded-full ${autoSpeak?'bg-blue-500 text-white':'bg-slate-200 text-slate-400'}`}>{autoSpeak?'ON':'OFF'}</span></button>
            <button onClick={()=>setShowSettings(false)} className="col-span-2 sm:col-span-1 flex items-center justify-center px-3 py-2.5 rounded-lg bg-slate-100 text-slate-500 text-xs hover:bg-slate-200">{tt('words_collapse')} ✕</button>
          </div>
        </div>
      )}

      {/* 搜索栏 — 仅 HSK 模式 */}
      {vocabMode === 'hsk' && view !== 'chooseMode' && (
        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input type="text" placeholder={tt('words_search_placeholder')} value={searchQ} onChange={e=>{setSearchQ(e.target.value);sfx.play('type')}} onFocus={()=>{if(searchQ)setView('search')}} onKeyDown={e=>{if(e.key==='Enter'&&searchResults[0]){const w=searchResults[0];setSessionQueue([w]);setIdx(0);setFlipped(false);setMode('flashcard');setSearchQ('');setSearchResults([]);setShowResult(false);setView('learning');sfx.play('click')}}} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
          {searchResults.length > 0 && (<div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden max-h-[360px] overflow-y-auto"><div className="grid grid-cols-1 sm:grid-cols-2 gap-0">{searchResults.map(w=><div key={w.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-indigo-50 cursor-pointer border-b border-slate-100" onClick={()=>{sfx.play('click');setSessionQueue([w]);setIdx(0);setFlipped(false);setMode('flashcard');setSearchQ('');setSearchResults([]);setShowResult(false);setView('learning')}}><span className="text-2xl">{w.emoji}</span><div className="min-w-0 flex-1"><div className="font-bold text-slate-800 text-sm">{w.hanzi}</div><div className="text-xs text-indigo-600">{w.pinyin}</div><div className="text-xs text-slate-400 truncate">{w.english}</div></div><SpeakBtn text={w.hanzi} wordId={w.id} className="w-7 h-7 text-sm bg-slate-50 shrink-0"/><span className="text-[10px] bg-slate-100 rounded px-1.5 py-0.5 shrink-0">HSK{w.level}</span></div>)}</div></div>)}
        </div>
      )}

      {/* ====== 视图：选择模式（HSK vs 教材）====== */}
      {view === 'chooseMode' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-700 text-center pt-2">{tt('choose_vocab_mode')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* HSK 等级词汇 */}
            <button onClick={()=>{setVocabMode('hsk');setView('dashboard');sfx.play('click')}} className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 text-left hover:border-indigo-400 hover:shadow-lg transition-all group">
              <div className="text-4xl mb-3 group-hover:scale-110 inline-block transition-transform">📚</div>
              <h4 className="text-lg font-bold text-slate-800">{tt('vocab_mode_hsk')}</h4>
              <p className="text-sm text-slate-500 mt-1">{tt('vocab_mode_hsk_desc')}</p>
              <div className="flex gap-1.5 mt-3 flex-wrap">{LEVELS.map(l=><span key={l} className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{background:LEVEL_GRADIENTS[l]}}>{l}</span>)}</div>
            </button>
            {/* 按教材背单词 */}
            <button onClick={()=>{setVocabMode('textbook');setTbStep('category');setView('textbookSelect');sfx.play('click')}} className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 text-left hover:border-emerald-400 hover:shadow-lg transition-all group">
              <div className="text-4xl mb-3 group-hover:scale-110 inline-block transition-transform">📖</div>
              <h4 className="text-lg font-bold text-slate-800">{tt('vocab_mode_textbook')}</h4>
              <p className="text-sm text-slate-500 mt-1">{tt('vocab_mode_textbook_desc')}</p>
              <div className="flex gap-1.5 mt-3 flex-wrap"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">《汉语教程》</span></div>
            </button>
          </div>
        </div>
      )}

      {/* ====== 视图：教材选择（三级钻取）====== */}
      {view === 'textbookSelect' && (
        <div className="space-y-4">
          {/* 面包屑 */}
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className={tbStep==='category'?'font-bold text-slate-700':''}>{tt('vocab_tb_step_category')}</span>
            {tbStep !== 'category' && <><span>›</span><button onClick={()=>setTbStep('category')} className={tbStep==='textbook'?'font-bold text-slate-700 hover:text-indigo-600':''}>{lang==='en'?'Textbook':'教材'}</button></>}
            {tbStep === 'lesson' && <><span>›</span><span className="font-bold text-slate-700">{lang==='en'?'Lesson':'课次'}</span></>}
          </div>

          {/* Step 1: 选分类 */}
          {tbStep === 'category' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.filter(c => textbookVocabList.some(t => t.categoryId === c.slug)).map(cat => (
                <button key={cat.slug} onClick={()=>{setTbCategoryId(cat.slug);setTbStep('textbook');sfx.play('click')}} className="rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-emerald-300 hover:shadow-md transition-all group">
                  <div className="text-3xl mb-2 group-hover:scale-110 inline-block transition-transform">{cat.icon}</div>
                  <h4 className="font-bold text-slate-800">{lang==='en'?cat.nameEn:cat.name}</h4>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: 选教材 */}
          {tbStep === 'textbook' && tbCategoryId && (
            <div className="grid grid-cols-1 gap-3">
              {textbookVocabList.filter(t => t.categoryId === tbCategoryId).map(tb => (
                <button key={tb.textbookId} onClick={()=>{setTbTextbookId(tb.textbookId);setTbStep('lesson');sfx.play('click')}} className="rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-emerald-300 hover:shadow-md transition-all group flex items-center gap-4">
                  <div className="text-3xl group-hover:scale-110 transition-transform">📖</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800">{lang==='en'?tb.titleEn:tb.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{tb.lessons.length} {lang==='en'?'lessons':'课'} · {tb.lessons.reduce((s,l)=>s+l.words.length,0)} {lang==='en'?'words':'词'}</p>
                  </div>
                  <span className="text-slate-300">›</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: 选课次 */}
          {tbStep === 'lesson' && tbTextbookId && (() => {
            const tb = textbookVocabList.find(t => t.textbookId === tbTextbookId)
            if (!tb) return null
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tb.lessons.map(lesson => {
                  const key = `${tb.textbookId}/${lesson.lessonId}`
                  const done = tbLearnedLessons[key] || 0
                  const total = lesson.words.length
                  const pct = total > 0 ? Math.round((done/total)*100) : 0
                  return (
                    <button key={lesson.lessonId} onClick={()=>{setTbLessonId(lesson.lessonId);startTextbookLessonSession(tb.textbookId, lesson.lessonId)}} className={`rounded-xl border p-4 text-left hover:shadow-md transition-all group ${pct>=100?'border-emerald-300 bg-emerald-50':'border-slate-200 bg-white hover:border-indigo-300'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-slate-800 text-sm">{lang==='en'?lesson.lessonTitleEn:lesson.lessonTitle}</h4>
                        {pct>=100 && <span className="text-xs text-emerald-600 font-bold">✓</span>}
                      </div>
                      <div className="text-xs text-slate-400">{total} {lang==='en'?'words':'个生词'}</div>
                      {pct > 0 && <div className="mt-1.5 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-emerald-400" style={{width:`${pct}%`}}/></div>}
                    </button>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      {/* ====== 视图：仪表盘 ====== */}
      {view === 'dashboard' && (
        <>
          {/* 计划卡 */}
          <section className="rounded-2xl overflow-hidden shadow-lg border border-slate-200/60">
            <div className="relative px-6 sm:px-8 pt-7 pb-9" style={{background:LEVEL_GRADIENTS[plan.level]}}>
              <div className="absolute top-4 right-4 sm:right-6 bg-white/20 backdrop-blur-md rounded-xl px-3 py-2 text-center min-w-[64px]"><div className="text-2xl font-black text-white leading-none">{daysRemaining}</div><div className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">Days</div></div>
              <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-white/10"/><div className="absolute bottom-0 right-20 w-24 h-24 rounded-full bg-white/5"/>
              <div className="relative z-10"><h3 className="text-xl sm:text-2xl font-black text-white">{LEVEL_NAMES[plan.level]}</h3><p className="text-sm text-white/75 mt-1">{tt('words_total_prefix')} {totalWords} {tt('words_words')} · {tt('words_est_prefix')} {estimatedFinishDate}{tt('words_estimated_finish')}</p></div>
            </div>
            <div className="px-6 sm:px-8 pb-6 space-y-5 bg-white">
              <div><div className="flex items-baseline gap-2 mb-1.5"><span className="text-xs text-slate-500 font-medium">{tt('words_total_progress')}</span></div>
                <div className="flex items-end gap-2 mb-2"><span className="text-3xl sm:text-4xl font-black text-slate-800">{progressPct}%</span><span className="text-xs text-slate-400 pb-1">({learnedSet.size}/{totalWords})</span></div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700 ease-out" style={{width:`${progressPct}%`,background:LEVEL_GRADIENTS[plan.level]}}/></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl bg-slate-50"><div className="text-lg font-bold text-slate-400">🎯</div><div className="text-base font-black text-slate-800 mt-0.5">{plan.dailyGoal}</div><div className="text-[11px] text-slate-400 mt-0.5">{tt('words_daily_goal')}</div></div>
                <div className="text-center p-3 rounded-xl bg-blue-50"><div className="text-lg font-bold text-blue-400">⚡</div><div className="text-base font-black text-blue-600 mt-0.5">{todayLog.learned||0}</div><div className="text-[11px] text-blue-400 mt-0.5">{tt('words_today_learned')}</div></div>
                <div className="text-center p-3 rounded-xl bg-orange-50"><div className="text-lg font-bold text-orange-400">🔄</div><div className="text-base font-black text-orange-600 mt-0.5">{plan.reviewIds.length}</div><div className="text-[11px] text-orange-400 mt-0.5">{tt('words_to_review')}</div></div>
              </div>
              <button onClick={startLearningSession} className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2" style={{background:'#1e293b'}}>▶ {tt('words_continue')}{remainingToday>0?`（${tt('words_remaining')} ${remainingToday} ${tt('words_words')}）`:''}</button>
            </div>
          </section>

          {/* 快捷入口 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button onClick={startLearningSession} className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-indigo-300 hover:shadow-md transition-all group"><div className="text-2xl mb-1 group-hover:scale-110 inline-block transition-transform">🆕</div><div className="text-sm font-bold text-slate-700">{tt('words_learn_new')}</div><div className="text-xs text-slate-400">{tt('words_remaining_count')} {newWordsToLearn.length}</div></button>
            <button onClick={()=>{if(plan.reviewIds.length===0){alert(tt('words_no_review'));return};const rw=plan.reviewIds.map(id=>levelWords.find(w=>w.id===id)).filter(Boolean)as HskWord[];if(!rw.length)return;setSessionQueue(shuffle(rw));setIdx(0);setFlipped(false);setScore({correct:0,wrong:0});setShowResult(false);setView('learning');sfx.play('click')}} className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-orange-300 hover:shadow-md transition-all group"><div className="text-2xl mb-1 group-hover:scale-110 inline-block transition-transform">🔄</div><div className="text-sm font-bold text-slate-700">{tt('words_review')}</div><div className="text-xs text-slate-400">{plan.reviewIds.length}</div></button>
            <button onClick={()=>setShowWrongBook(true)} className={`rounded-xl border p-4 text-left transition-all group ${wrongWords.length>0?'bg-red-50 border-red-200 hover:border-red-300 hover:shadow-md':'border-slate-200 bg-white hover:border-slate-300'}`}><div className="text-2xl mb-1 group-hover:scale-110 inline-block transition-transform">📝</div><div className="text-sm font-bold text-slate-700">{tt('words_wrong_book')}</div><div className={`text-xs ${wrongWords.length>0?'text-red-500 font-semibold':'text-slate-400'}`}>{wrongWords.length} {tt('words_wrong_count')}</div></button>
            <button onClick={startReviewAllSession} className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-emerald-300 hover:shadow-md transition-all group"><div className="text-2xl mb-1 group-hover:scale-110 inline-block transition-transform">📚</div><div className="text-sm font-bold text-slate-700">{tt('words_review_all')}</div><div className="text-xs text-slate-400">{totalWords} {tt('words_random_pick')}</div></button>
            <button onClick={()=>{const nw=newWordsToLearn.length>0?newWordsToLearn.slice(0,plan.dailyGoal):shuffle(levelWords).slice(0,Math.max(plan.dailyGoal,20));setSessionQueue(shuffle(nw));setIdx(0);setScore({correct:0,wrong:0});setShowResult(false);setView('learning');setMode('type');sfx.play('click')}} className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-purple-300 hover:shadow-md transition-all group"><div className="text-2xl mb-1 group-hover:scale-110 inline-block transition-transform">⌨️</div><div className="text-sm font-bold text-slate-700">{tt('words_type_practice')}</div><div className="text-xs text-slate-400">{tt('words_type_desc')}</div></button>
            {/* 错词专项复习 */}
            {wrongWords.length > 0 && (
              <button onClick={()=>{if(wrongWords.length===0)return;setSessionQueue(shuffle(wrongWords));setIdx(0);setScore({correct:0,wrong:0});setShowResult(false);setView('learning');setMode('quiz');sfx.play('click')}} className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 p-4 text-left hover:border-red-300 hover:shadow-md transition-all group"><div className="text-2xl mb-1 group-hover:scale-110 inline-block transition-transform">🎯</div><div className="text-sm font-bold text-red-700">{tt('words_wrong_practice')}</div><div className="text-xs text-red-400">{tt('words_wrong_practice_desc')}</div></button>
            )}
          </div>

          {/* 级别切换 */}
          <div className="pt-2"><p className="text-xs text-slate-400 mb-2 font-medium">{tt('words_switch_level')}</p><div className="flex gap-2 flex-wrap">{LEVELS.map(l=><button key={l} onClick={()=>{updatePlan({level:l});sfx.play('levelChange')}} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${plan.level===l?'shadow-sm text-white border-transparent':'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`} style={plan.level===l?{background:LEVEL_GRADIENTS[l]}:{}}>{LEVEL_NAMES[l]} <span className="ml-1 opacity-70">{WORD_COUNTS[l]}</span></button>)}</div></div>
        </>
      )}

      {/* ====== 视图：学习中 ====== */}
      {view === 'learning' && (
        <>
          {/* 顶栏 */}
          <div className="flex items-center gap-3">
            <button onClick={()=>{setView(vocabMode==='textbook'?'textbookSelect':'dashboard');setShowResult(false);sfx.play('click')}} className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 font-medium px-2 py-1 rounded-lg hover:bg-indigo-50">← {tt('back')}</button>
            <div className="flex-1"><div className="flex justify-between text-xs text-slate-400 mb-1"><span>{idx+1}/{sessionQueue.length}</span><span>✅{score.correct} ❌{score.wrong}</span></div><div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-all duration-300" style={{width:`${((idx+1)/sessionQueue.length)*100}%`}}/></div></div>
          </div>

          {/* 模式切换 */}
          <div className="flex gap-2 justify-center items-center flex-wrap">
            {( ['flashcard','quiz','type'] as Mode[]).map(m=><button key={m} onClick={()=>{setMode(m);sfx.play('click')}} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all border ${mode===m?'bg-indigo-500 text-white border-indigo-500 shadow':'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>{m==='flashcard'?'🃏 '+tt('words_card'):m==='quiz'?'🎯 '+tt('words_quiz'):'⌨️ '+tt('words_type')}</button>)}
            <button onClick={()=>{setAutoSpeak(a=>!a);sfx.play('click')}} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${autoSpeak?'bg-indigo-50 text-indigo-600 border-indigo-200':'bg-white text-slate-400 border-slate-200'}`}>{autoSpeak?'🔊':'🔇'}{tt('words_auto_read')}</button>
            <button onClick={()=>{setShowPinyin(p=>!p);sfx.play('click')}} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${showPinyin?'bg-indigo-50 text-indigo-600 border-indigo-200':'bg-white text-slate-400 border-slate-200'}`}>{showPinyin?'🔤':'🙈'}{tt('words_pinyin_toggle')}</button>
            {mode==='type' && (<div className="flex rounded-lg border border-slate-200 overflow-hidden ml-1"><button onClick={()=>{setTypeHintMode('english');sfx.play('click')}} className={`px-3 py-1.5 text-xs font-semibold ${typeHintMode==='english'?'bg-purple-500 text-white':'bg-white text-slate-500 hover:bg-slate-50'}`}>英文释义</button><button onClick={()=>{setTypeHintMode('pinyin');sfx.play('click')}} className={`px-3 py-1.5 text-xs font-semibold border-l border-slate-200 ${typeHintMode==='pinyin'?'bg-purple-500 text-white':'bg-white text-slate-500 hover:bg-slate-50'}`}>拼音</button></div>)}
          </div>

          {/* 翻转词卡 */}
          {mode==='flashcard' && current && !showResult && (
            <div className="space-y-4">
              <div
                onTouchStart={(e) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, swiping: false } }}
                onTouchMove={(e) => { if (Math.abs(e.touches[0].clientX - touchRef.current.x) > 30) touchRef.current.swiping = true }}
                onTouchEnd={(e) => {
                  const dx = e.changedTouches[0].clientX - touchRef.current.x
                  if (Math.abs(dx) > 60) {
                    if (dx < 0 && idx+1 < sessionQueue.length) { setIdx(i=>i+1); setFlipped(false); sfx.play('flip') }
                    else if (dx > 0 && idx > 0) { setIdx(i=>i-1); setFlipped(false); sfx.play('click') }
                  }
                }}
                onClick={() => { if (!touchRef.current.swiping) { setFlipped(f=>!f); sfx.play('flip') } }}
                className="relative cursor-pointer select-none" style={{perspective:'1000px'}}>
                <div className="relative w-full transition-all duration-500" style={{transformStyle:'preserve-3d',transform:flipped?'rotateY(180deg)':'rotateY(0deg)',minHeight:'280px'}}>
                  {/* 正面 */}
                  <div className="absolute inset-0 rounded-2xl bg-white border border-slate-200 shadow-md flex flex-col items-center justify-center gap-3 p-6 sm:p-8" style={{backfaceVisibility:'hidden'}}>
                    <button onClick={(e)=>{e.stopPropagation();handleToggleFav(current.id)}} className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full hover:bg-amber-50 transition-all text-2xl" title={tt('words_fav')}>{favSet.has(current.id)?'⭐':'☆'}</button>
                    <div className="text-6xl sm:text-7xl">{current.emoji}</div>
                    <div className="flex items-center gap-2"><div className="text-4xl sm:text-5xl font-black text-slate-800">{current.hanzi}</div><SpeakBtn text={current.hanzi} wordId={current.id} className="w-9 h-9 sm:w-10 sm:h-10 text-lg bg-indigo-50 text-indigo-600"/></div>
                    {showPinyin && <div className="text-base sm:text-lg text-indigo-500 font-medium">{current.pinyin}</div>}
                    {!showPinyin && <div className="text-base sm:text-lg text-slate-300 font-medium italic">{tt('words_pinyin_hidden')}</div>}
                    <div className="text-xs text-slate-400 mt-1">{tt('words_tap_flip')} · Tap to flip</div>
                  </div>
                  {/* 背面：删拼音，加HSK例句 */}
                  <div className="absolute inset-0 rounded-2xl shadow-md flex flex-col items-center justify-center gap-2.5 p-6 sm:p-8" style={{backfaceVisibility:'hidden',transform:'rotateY(180deg)',background:'linear-gradient(135deg,#eef2ff,#f5f3ff)'}}>
                    <button onClick={(e)=>{e.stopPropagation();handleToggleFav(current.id)}} className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full hover:bg-amber-50 transition-all text-2xl" title={tt('words_fav')}>{favSet.has(current.id)?'⭐':'☆'}</button>
                    <div className="flex items-center gap-2"><div className="text-3xl sm:text-4xl font-black text-indigo-700">{current.hanzi}</div><SpeakBtn text={current.hanzi} wordId={current.id} className="w-8 h-8 sm:w-9 sm:h-9 text-base bg-white/60 text-indigo-600"/></div>
                    <div className="text-lg sm:text-xl font-semibold text-slate-700 text-center">{current.english}</div>
                    <div className="text-sm text-slate-500 text-center italic">{current.fullEnglish}</div>
                    {/* 例句：教材优先使用自带例句，HSK使用genExample */}
                    {(() => {
                      const tbEx = tbExampleMap.get(current.id)
                      const ex = tbEx || genExample(current)
                      return (
                        <div className="mt-1 px-4 py-2.5 rounded-xl bg-white/60 border border-indigo-100 max-w-[92%]">
                          <div className="text-sm font-medium text-slate-700">{ex.cn}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{ex.en}</div>
                        </div>
                      )
                    })()}
                    <span className="mt-1 text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">{current.posCn||current.pos}{vocabMode==='textbook'?'':'·HSK'+current.level}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={()=>{if(idx>0){setIdx(i=>i-1);setFlipped(false);sfx.play('click')}}} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 disabled:opacity-40 active:scale-95 transition-all" disabled={idx===0}>← {tt('words_prev_card')}</button>
                <button onClick={handleFlashcardNext} className="px-8 py-3 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 shadow-sm active:scale-95 transition-all">{idx+1>=sessionQueue.length?`${tt('words_complete')} ✓`:`${tt('words_next_card')} →`}</button>
              </div>
              <p className="text-center text-[11px] text-slate-300">← {tt('words_swipe_hint')} →</p>
            </div>
          )}

          {/* 四选一测验 */}
          {mode==='quiz' && current && !showResult && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white border border-slate-200 shadow-md p-6 flex flex-col items-center gap-3 min-h-[180px] justify-center">
                <div className="text-5xl">{current.emoji}</div>
                <div className="flex items-center gap-2"><div className="text-4xl font-black text-slate-800">{current.hanzi}</div><SpeakBtn text={current.hanzi} wordId={current.id} className="w-8 h-8 text-lg bg-indigo-50 text-indigo-600"/></div>
                {showPinyin && <div className="text-sm text-indigo-500 font-medium">{current.pinyin}</div>}<p className="text-xs text-slate-400">{tt('words_select_correct')}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {options.map(opt=>{
                  let cls='bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'
                  if(chosen){if(opt.id===current.id)cls='bg-green-50 border-green-400 text-green-800';else if(opt.id===chosen)cls='bg-red-50 border-red-400 text-red-800';else cls='bg-white border-slate-100 text-slate-400 opacity-60'}
                  return(<button key={opt.id} onClick={()=>handleAnswer(opt)} className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all duration-150 ${cls}`}><div className="font-semibold text-[13px] leading-snug">{opt.english}</div><div className="text-[11px] opacity-60 mt-0.5">{opt.pos}</div></button>)
                })}
              </div>
            </div>
          )}

          {/* 打字模式 */}
          {mode==='type' && current && !showResult && (
            <div className="space-y-5">
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md" style={{background:typedCorrect===false?'linear-gradient(135deg,#fef2f2,#fff1f2)':typedCorrect===true?'linear-gradient(135deg,#f0fdf4,#f0fff4)':'white'}}>
                <div className="relative px-8 pt-8 pb-6 text-center" style={{background:typedCorrect===false?'rgba(239,68,68,0.03)':typedCorrect===true?'rgba(34,197,94,0.03)':'transparent'}}>
                  <div className="absolute top-3 left-3 opacity-30"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></div>
                  <div className="absolute top-3 right-3"><SpeakBtn text={current.hanzi} wordId={current.id} className="w-8 h-8 bg-white/80 text-slate-600 shadow-sm"/></div>
                  <div className={`text-7xl my-4 ${typedCorrect===false?'animate-shake':''}`} style={{transform:typedCorrect===true?'scale(1.05)':undefined}}>{current.emoji}</div>
                  <div className="mt-3">{typeHintMode==='english'?(<><div className="text-base font-bold text-slate-700">{current.fullEnglish||current.english}</div>{showPinyin && <div className="text-sm text-indigo-500 font-medium mt-1">{current.pinyin}</div>}</>):(<><div className="text-2xl font-black text-slate-800 tracking-wide">{current.pinyin}</div><div className="text-sm text-slate-500 mt-1">{current.english}</div></>)}</div>
                  <div className="inline-flex mt-3 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">{current.posCn}·HSK{current.level}</div>
                </div>
                <div className="border-t border-slate-100"/>
                <div className="px-6 pb-7 pt-5 space-y-4">
                  <div className="text-center"><span className={`text-sm font-extrabold tracking-[0.25em] uppercase ${typedCorrect===false?'text-red-400':typedCorrect===true?'text-green-500':'text-slate-300'}`}>{typedCorrect===false?tt('words_try_again'):typedCorrect===true?tt('words_correct_excl'):tt('words_type_word')}</span></div>
                  <div className="flex justify-center gap-2">{current.hanzi.split('').map((char,i)=><div key={i} className={`w-3 h-3 rounded-full ${typedCorrect!==null?(typedCorrect?'bg-green-400':'bg-red-300'):i<typeInput.length?'bg-indigo-400':'bg-slate-200'}`} />)}</div>
                  <div className="flex justify-center"><input ref={typeInputRef} type="text" value={typeInput} onChange={e=>{setTypeInput(e.target.value);sfx.play('keyboard');setTypedCorrect(null)}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();handleTypeSubmit()}else if(e.key==='Backspace'&&!e.nativeEvent.metaKey&&!e.nativeEvent.ctrlKey)sfx.play('delete')}} placeholder={`${current.hanzi.split('').map(()=>'_').join(' ')}`} className={`text-center text-3xl font-black tracking-[0.3em] outline-none border-b-2 bg-transparent px-4 py-2 w-[240px] autoComplete="off" autoCapitalize="off" spellCheck={false} ${typedCorrect===false?'border-red-400 text-red-500 placeholder-red-200':typedCorrect===true?'border-green-400 text-green-600':'border-slate-300 text-slate-800 placeholder-slate-200 focus:border-indigo-400'}`} style={{fontFamily:'"Noto Sans SC","Microsoft YaHei",sans-serif'}}/></div>
                  {!typedCorrect && (<div className="flex justify-center gap-3 pt-1"><button onClick={handleTypeSubmit} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-bold hover:from-indigo-600 hover:to-purple-600 shadow-md active:scale-95">✓ {tt('words_type_confirm')} (Enter)</button><button onClick={handleTypeSkip} className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 text-sm hover:bg-slate-50">{tt('skip')} →</button></div>)}
                  {typedCorrect!==null && (<div className="text-center">{typedCorrect?(<div className="text-green-600 font-bold">✅ {tt('words_type_correct')} {current.hanzi}</div>):(<div className="text-red-500 font-medium">❌ {tt('words_type_wrong')}<span className="font-bold text-lg ml-1">{current.hanzi}</span></div>)}</div>)}
                </div>
              </div>
              <div className="flex justify-center gap-4 text-[11px] text-slate-400"><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 font-mono">Enter</kbd>{tt('words_type_confirm')} <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 font-mono">Esc</kbd>{tt('skip')}</div>
            </div>
          )}

          {/* 结果页 */}
          {showResult && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-md p-8 text-center space-y-4">
              <div className="text-5xl">{score.correct>=sessionQueue.length*0.8?'🎉':score.correct>=sessionQueue.length*0.5?'😊':'😅'}</div>
              <h3 className="text-xl font-bold text-slate-800">{tt('words_round_done')}</h3>
              <div className="flex justify-center gap-8"><div><div className="text-3xl font-black text-green-500">{score.correct}</div><div className="text-xs text-slate-400">{tt('words_correct_count')}</div></div><div><div className="text-3xl font-black text-red-400">{score.wrong}</div><div className="text-xs text-slate-400">{tt('words_wrong_count_label')}</div></div><div><div className="text-3xl font-black text-indigo-500">{Math.round(score.correct/sessionQueue.length*100)}%</div><div className="text-xs text-slate-400">{tt('words_accuracy')}</div></div></div>
              {(mode==='quiz'||mode==='type')&&<div className="text-sm text-indigo-600 font-medium">+{score.correct*10} XP 🌟</div>}
              <div className="flex gap-3 justify-center"><button onClick={vocabMode==='textbook'?(()=>{if(tbTextbookId&&tbLessonId)startTextbookLessonSession(tbTextbookId,tbLessonId)}):startLearningSession} className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 shadow-sm">🔄 {tt('words_again')}</button><button onClick={()=>{setView(vocabMode==='textbook'?'textbookSelect':'dashboard');sfx.play('click')}} className="px-6 py-2.5 bg-white text-slate-600 rounded-xl font-bold border border-slate-200 hover:bg-slate-50">← {tt('words_back_home')}</button></div>
            </div>
          )}
        </>
      )}

      {/* 错词本弹窗 */}
      {showWrongBook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={(e)=>{if(e.target===e.currentTarget){setShowWrongBook(false);sfx.play('click')}}}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">📝 {tt('words_wrong_book')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{tt('words_wrong_book_hint')}</p>
              </div>
              <button onClick={()=>{setShowWrongBook(false);sfx.play('click')}} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-lg">×</button>
            </div>
            <div className="px-6 pb-6 pt-2">
              {wrongWords.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-sm text-slate-500 font-medium">{tt('words_no_wrong')}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-red-500 font-semibold">{wrongWords.length} {tt('words_wrong_words')}</span>
                    <button onClick={()=>{setSessionQueue(shuffle(wrongWords));setIdx(0);setScore({correct:0,wrong:0});setShowResult(false);setShowWrongBook(false);setView('learning');setMode('quiz');sfx.play('click')}} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold hover:from-red-600 hover:to-orange-600 shadow-sm active:scale-95 transition-all">🎯 {tt('words_wrong_practice')}</button>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                    {wrongWords.map(w => (
                      <div key={w.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-red-50/60 border border-red-100 hover:bg-red-50 transition-all">
                        <div className="text-2xl shrink-0">{w.emoji}</div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 text-sm">{w.hanzi}</div>
                          <div className="text-xs text-indigo-600">{w.pinyin}</div>
                          <div className="text-xs text-slate-400 truncate">{w.english}</div>
                        </div>
                        <SpeakBtn text={w.hanzi} wordId={w.id} className="w-7 h-7 text-sm bg-white/80 shrink-0"/>
                        <button onClick={()=>{onRemoveWrongWord?.(w.id);sfx.play('delete')}} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-100 shrink-0 transition-all" title={tt('words_remove_wrong')}>✕</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 修改计划弹窗 */}
      {showPlanModal && (<div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={(e)=>{if(e.target===e.currentTarget){setShowPlanModal(false);sfx.play('click')}}}><div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/><div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"><div className="flex items-center justify-between px-6 pt-5 pb-2"><div><h3 className="text-lg font-bold text-slate-800">{tt('plan_title')}</h3><p className="text-xs text-slate-400 mt-0.5">{tt('plan_subtitle')}</p></div><button onClick={()=>{setShowPlanModal(false);sfx.play('click')}} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-lg">×</button></div><div className="px-6 pb-6 pt-4"><PlanModalInner currentLevel={plan.level} currentDailyGoal={plan.dailyGoal} onSave={(l,g)=>saveNewPlan(l,g)} onClose={()=>setShowPlanModal(false)} lang={lang}/></div></div></div>)}
    </div>
  )
}

// PlanModalInner 组件
interface PlanModalInnerProps { currentLevel: 1|2|3|4|5|6; currentDailyGoal: number; onSave(l: number, g: number): void; onClose(): void; lang?: Lang }
function PlanModalInner({ currentLevel, currentDailyGoal, onSave, onClose, lang = 'zh' }: PlanModalInnerProps) {
  const tt = (k: Parameters<typeof t>[0]) => t(k, lang)
  const [level,setLevel]=useState<1|2|3|4|5|6>(currentLevel), [dailyGoal,setDailyGoal]=useState(currentDailyGoal)
  const wordsInLevel=WORD_COUNTS[level], estDays=dailyGoal>0?Math.ceil(wordsInLevel/dailyGoal):0
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black text-white shrink-0" style={{background:LEVEL_GRADIENTS[level]}}>H{level}</div>
        <div className="min-w-0 flex-1"><div className="font-bold text-slate-800 text-sm">{LEVEL_NAMES[level]}</div><div className="text-xs text-slate-400">{wordsInLevel}{tt('plan_words')}·{level<=2?tt('level_beginner'):level<=4?tt('level_intermediate'):tt('level_advanced')}</div></div>
        <div className="flex gap-1">{LEVELS.map(l=><button key={l} onClick={()=>{setLevel(l);sfx.play('levelChange')}} className={`w-7 h-7 rounded-lg text-[11px] font-bold ${l===level?'text-white shadow':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`} style={l===level?{background:LEVEL_GRADIENTS[l]}:{}}>{l}</button>)}</div>
      </div>
    <div><label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 mb-2.5"><span>◎</span> {tt('plan_daily_goal')}</label><div className="grid grid-cols-4 gap-2">{DAILY_OPTIONS.map(opt=><button key={opt} onClick={()=>{setDailyGoal(opt);sfx.play('click')}} className={`py-2.5 rounded-xl text-base font-bold border ${dailyGoal===opt?'border-indigo-500 bg-indigo-500 text-white shadow-md scale-[1.02]':'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>{opt}</button>)}</div></div>
    <div className="rounded-xl bg-slate-50 p-4 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">🕐</div><div><div className="text-sm font-medium text-slate-700">{tt('plan_estimated')}</div><div className="text-xs text-slate-400">{tt('plan_every_day')}<span className="font-bold text-slate-600 mx-0.5">{dailyGoal}</span>{tt('plan_words')}，{lang==='en'?'~':''}<span className="font-bold text-indigo-600 mx-0.5">{estDays}</span>{tt('plan_finish_in')}</div></div></div>
    <button onClick={()=>{onSave(level,dailyGoal);sfx.play('complete')}} className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold text-base hover:bg-slate-800 transition-colors active:scale-[0.98] flex items-center justify-center gap-2">{tt('plan_save')} <span className="opacity-60">›</span></button>
  </div>)
}
