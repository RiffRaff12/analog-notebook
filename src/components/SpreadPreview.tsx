import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Spread, TextBox } from '../modules'
import type { TextBoxManager } from '../modules/TextBoxManager'

interface Props {
  spread: Spread
  tbManager: TextBoxManager | null
  anchorX: number
  anchorBottom: number
}

const PREVIEW_W = 280
const PREVIEW_PAGE_W = PREVIEW_W / 2
const BASE_SPREAD_W = 296
const BASE_SPREAD_H = 210
const PREVIEW_H = PREVIEW_W * (BASE_SPREAD_H / BASE_SPREAD_W)
const PREVIEW_PAGE_H = PREVIEW_H
const MM_SCALE = PREVIEW_W / BASE_SPREAD_W

export function SpreadPreview({ spread, tbManager, anchorX, anchorBottom }: Props) {
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([])

  useEffect(() => {
    if (!tbManager) return
    tbManager.getTextBoxes(spread.id).then(setTextBoxes)
  }, [spread.id, tbManager])

  const dotSpacing = 5 * MM_SCALE

  const left = Math.max(8, Math.min(anchorX - PREVIEW_W / 2, window.innerWidth - PREVIEW_W - 8))
  const bottom = window.innerHeight - anchorBottom + 8

  const renderPage = (pageIndex: 0 | 1) => {
    const boxes = textBoxes.filter(b => b.pageIndex === pageIndex)
    return (
      <div
        style={{
          width: PREVIEW_PAGE_W,
          height: PREVIEW_PAGE_H,
          backgroundColor: '#FAFAF7',
          backgroundImage: `radial-gradient(circle, #c8bfb0 0.8px, transparent 0.8px)`,
          backgroundSize: `${dotSpacing}px ${dotSpacing}px`,
          backgroundPosition: `${dotSpacing / 2}px ${dotSpacing / 2}px`,
          position: 'relative',
          borderLeft: pageIndex === 1 ? '1px solid #e0d8cc' : undefined,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {boxes.map(box => (
          <div
            key={box.id}
            style={{
              position: 'absolute',
              left: box.x * PREVIEW_PAGE_W,
              top: box.y * PREVIEW_PAGE_H,
              fontSize: 6,
              fontFamily: 'Caveat, cursive',
              color: '#3a3530',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.3,
              maxWidth: (1 - box.x) * PREVIEW_PAGE_W,
              opacity: box.isStruck ? 0.4 : 1,
              textDecoration: box.isStruck ? 'line-through' : undefined,
            }}
          >
            {box.content}
          </div>
        ))}
      </div>
    )
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left,
        bottom,
        width: PREVIEW_W,
        height: PREVIEW_H,
        display: 'flex',
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        borderRadius: 4,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {renderPage(0)}
      {renderPage(1)}
    </div>,
    document.body,
  )
}
