#!/usr/bin/env python3
"""
Generate TTS audio files using edge-tts for all sentences in content.ts.
File naming: {sentenceId}.mp3 (e.g., l1t1s1.mp3)
Voice: zh-CN-XiaoxiaoNeural (natural neural TTS)
Rate: -5% (slightly slower for beginner learners)

Handles 一/不 tone sandhi correctly via the neural TTS model.
"""

import sys, os, asyncio, re, json

sys.path.insert(0, 'pylibs')
sys.stdout.reconfigure(encoding='utf-8')

import edge_tts

AUDIO_DIR = 'public/audio'
CONTENT_FILE = 'src/data/content.ts'

def extract_sentences_from_ts(filepath):
    """Parse content.ts and extract all sentence IDs and Chinese text."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    sentences = {}
    # Match pattern: id: 'lXtYsZ', ... cn: "Chinese text"
    # We need to handle multi-line objects
    # Find all sentence blocks
    pattern = r"id:\s*'([^']+)'\s*,\s*\n?\s*cn:\s*\"([^\"]+)\""
    for m in re.finditer(pattern, content):
        sid = m.group(1)
        cn = m.group(2)
        sentences[sid] = cn

    return sentences


async def generate_audio(sentence_id: str, text: str, voice: str, rate: str):
    """Generate a single audio file using edge-tts."""
    filepath = os.path.join(AUDIO_DIR, f"{sentence_id}.mp3")

    # Skip if already exists
    if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
        return True

    try:
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        await communicate.save(filepath)
        return os.path.exists(filepath) and os.path.getsize(filepath) > 1000
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


async def main():
    print("=" * 60)
    print("edge-tts Audio Generator for 句游汉语")
    print("=" * 60)

    # Extract sentences from content.ts
    sentences = extract_sentences_from_ts(CONTENT_FILE)
    print(f"\nExtracted {len(sentences)} sentences from {CONTENT_FILE}")

    # Settings
    voice = "zh-CN-XiaoxiaoNeural"  # Most natural Chinese voice
    rate = "-5%"  # Slightly slower for beginners

    print(f"Voice: {voice}")
    print(f"Rate: {rate}")

    # Ensure audio directory exists
    os.makedirs(AUDIO_DIR, exist_ok=True)

    # Count existing
    existing = sum(1 for sid in sentences if os.path.exists(os.path.join(AUDIO_DIR, f"{sid}.mp3")))
    print(f"Already existing: {existing}")
    print(f"To generate: {len(sentences) - existing}")

    # Generate audio files
    ok = 0
    fail = 0
    for i, (sid, cn) in enumerate(sentences.items()):
        filepath = os.path.join(AUDIO_DIR, f"{sid}.mp3")
        if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
            ok += 1
            continue

        print(f"  [{i+1}/{len(sentences)}] {sid}: {cn[:30]}...", end="", flush=True)
        success = await generate_audio(sid, cn, voice, rate)
        if success:
            ok += 1
            print(" OK")
        else:
            fail += 1
            print(" FAIL")

    print(f"\n{'='*60}")
    print(f"Total: {ok} OK, {fail} FAIL out of {len(sentences)} sentences")
    print(f"Audio directory: {AUDIO_DIR}")

    # Also generate audio for important individual words
    # (for the word popup feature)
    print("\nGenerating word audio (for word popup)...")
    words = set()
    for cn in sentences.values():
        for c in cn:
            if re.match(r'[\u4e00-\u9fff]', c):
                words.add(c)

    word_voice = "zh-CN-XiaoxiaoNeural"
    word_rate = "-8%"  # Even slower for individual characters
    word_ok = 0
    word_fail = 0

    for i, word in enumerate(sorted(words)):
        filepath = os.path.join(AUDIO_DIR, f"w_{word}.mp3")
        if os.path.exists(filepath) and os.path.getsize(filepath) > 500:
            word_ok += 1
            continue

        print(f"  [{i+1}/{len(words)}] {word}", end="", flush=True)
        try:
            communicate = edge_tts.Communicate(word, word_voice, rate=word_rate)
            await communicate.save(filepath)
            if os.path.exists(filepath) and os.path.getsize(filepath) > 500:
                word_ok += 1
                print(" OK")
            else:
                word_fail += 1
                print(" FAIL")
        except Exception as e:
            word_fail += 1
            print(f" FAIL: {e}")

    print(f"\nWord audio: {word_ok} OK, {word_fail} FAIL out of {len(words)} characters")


if __name__ == '__main__':
    asyncio.run(main())
