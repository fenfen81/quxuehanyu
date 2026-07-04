import { useEffect, useRef, useCallback, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Lang } from '@/i18n/translations'
import { t } from '@/i18n/translations'

interface WordPopupProps {
  word: string | null
  pinyin: string
  meaning: string
  open: boolean
  onOpenChange: (open: boolean) => void
  lang?: Lang
}

export function WordPopup({ word, pinyin, meaning, open, onOpenChange, lang = 'zh' }: WordPopupProps) {
  const tt = (k: Parameters<typeof t>[0]) => t(k, lang)
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const writersRef = useRef<any[]>([])
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    if (!open || !word) return

    setStatusMsg(`⏳ ${tt('popup_loading')}`)

    writersRef.current.forEach((w) => { try { w.destroy() } catch {} })
    writersRef.current = []
    if (containerRef.current) containerRef.current.innerHTML = ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const HW = (window as any).HanziWriter
    if (!HW) {
      setStatusMsg(`❌ ${tt('popup_not_loaded')}`)
      if (containerRef.current) {
        containerRef.current.innerHTML =
          `<div style="color:red;padding:20px;text-align:center">${tt('popup_not_loaded')}<br><small>${tt('popup_refresh')}</small></div>`
      }
      return
    }

    const charArr = word.split('').filter(c => /[\u4e00-\u9fff]/.test(c))
    if (charArr.length === 0) {
      setStatusMsg(`⚠️ ${tt('popup_no_hanzi')}`)
      return
    }

    const cellSize = Math.min(140, Math.floor((window.innerWidth - 80) / Math.max(charArr.length, 1)))
    const hwSize = Math.max(80, Math.min(cellSize, 140))

    let attempts = 0
    const maxAttempts = 20

    const initWriters = () => {
      attempts++

      if (!containerRef.current) {
        if (attempts < maxAttempts) {
          requestAnimationFrame(initWriters)
        } else {
          setStatusMsg(`❌ ${tt('popup_not_loaded')}`)
        }
        return
      }

      containerRef.current.innerHTML = ''
      let successCount = 0

      charArr.forEach((c, idx) => {
        const div = document.createElement('div')
        div.style.display = 'inline-block'
        div.style.textAlign = 'center'
        div.style.verticalAlign = 'top'
        div.style.margin = '0 8px'

        const nameDiv = document.createElement('div')
        nameDiv.style.fontWeight = 'bold'
        nameDiv.style.fontSize = '20px'
        nameDiv.textContent = c
        div.appendChild(nameDiv)

        const sbId = 'hw-' + c + '-' + idx + '-' + Date.now()
        const strokeBox = document.createElement('div')
        strokeBox.id = sbId
        strokeBox.style.width = hwSize + 'px'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(strokeBox as any).style.height = hwSize + 'px'
        strokeBox.style.border = '1px solid #ddd'
        strokeBox.style.margin = '4px auto'
        strokeBox.style.borderRadius = '4px'
        strokeBox.style.backgroundColor = '#fff'
        div.appendChild(strokeBox)

        containerRef.current!.appendChild(div)

        try {
          const w = HW.create(sbId, c, {
            width: hwSize,
            height: hwSize,
            padding: 8,
            strokeColor: '#2255bb',
            outlineColor: '#ddd',
            showOutline: true,
            dataPath: '/hanzi-data',
          })
          if (w) {
            writersRef.current.push(w)
            successCount++
          } else {
            console.warn('HanziWriter.create returned null for', c)
          }
        } catch (err) {
          console.error('HanziWriter create error for "' + c + '":', err)

          const errDiv = document.createElement('div')
          errDiv.style.color = 'red'
          errDiv.style.fontSize = '12px'
          errDiv.style.padding = '40px 10px'
          errDiv.textContent = `${tt('popup_load_failed')} ` + c
          strokeBox.appendChild(errDiv)
        }
      })

      if (successCount === charArr.length) {
        setStatusMsg('')
      } else if (successCount > 0) {
        setStatusMsg(`⚠️ ${tt('popup_partial')} (${successCount}/${charArr.length})`)
      } else {
        setStatusMsg(`❌ ${tt('popup_all_failed')}`)
      }
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(initWriters)
    })

    return () => {
      writersRef.current.forEach((w) => { try { w.destroy() } catch {} })
      writersRef.current = []
      setStatusMsg('')
    }
  }, [open, word, lang])

  const playAll = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writersRef.current.forEach((w: any) => { try { w.animateCharacter() } catch {} })
  }, [])

  const resetAll = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writersRef.current.forEach((w: any) => {
      try { w.hideCharacter(); w.showOutline() } catch {}
    })
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {word}
            {statusMsg && <span className="text-sm font-normal text-muted-foreground">{statusMsg}</span>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 text-base">
            <span><strong>{tt('popup_pinyin')}：</strong>{pinyin || '—'}</span>
            <span><strong>{tt('popup_meaning')}：</strong>{meaning || '—'}</span>
          </div>
          <div
            ref={containerRef}
            className="flex flex-wrap justify-center py-2 min-h-[150px] border rounded-lg bg-gray-50"
            style={{ minHeight: '150px' }}
          />
          <div className="flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={playAll}>
              ▶ {tt('popup_play_stroke')}
            </Button>
            <Button variant="outline" size="sm" onClick={resetAll}>
              ↺ {tt('reset')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
