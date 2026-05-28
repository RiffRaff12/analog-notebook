import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Spread, TextBox, ImageBox } from '../modules'
import type { TextBoxManager } from '../modules/TextBoxManager'
import type { ImageBoxManager } from '../modules/ImageBoxManager'

interface Props {
  spread: Spread
  tbManager: TextBoxManager | null
  ibManager: ImageBoxManager | null
  anchorX: number
  anchorBottom: number
  onDelete?: () => void
  canDelete?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

const PREVIEW_W = 280
const PREVIEW_PAGE_W = PREVIEW_W / 2
const BASE_SPREAD_W = 296
const BASE_SPREAD_H = 210
const PREVIEW_H = PREVIEW_W * (BASE_SPREAD_H / BASE_SPREAD_W)
const PREVIEW_PAGE_H = PREVIEW_H
const MM_SCALE = PREVIEW_W / BASE_SPREAD_W

export function SpreadPreview({ spread, tbManager, ibManager, anchorX, anchorBottom, onDelete, canDelete, onMouseEnter, onMouseLeave }: Props) {
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([])
  const [imageBoxes, setImageBoxes] = useState<ImageBox[]>([])
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (!tbManager) return
    tbManager.getTextBoxes(spread.id).then(setTextBoxes)
  }, [spread.id, tbManager])

  useEffect(() => {
    if (!ibManager) return
    let cancelled = false
    const createdUrls: string[] = []

    ibManager.getImageBoxes(spread.id).then(boxes => {
      if (cancelled) return
      setImageBoxes(boxes)
      const urlMap = new Map<string, string>()
      boxes.forEach(box => {
        const url = URL.createObjectURL(box.imageData)
        createdUrls.push(url)
        urlMap.set(box.id, url)
      })
      setImageUrls(urlMap)
    })

    return () => {
      cancelled = true
      createdUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [spread.id, ibManager])

  const dotSpacing = 5 * MM_SCALE

  const left = Math.max(8, Math.min(anchorX - PREVIEW_W / 2, window.innerWidth - PREVIEW_W - 8))
  const bottom = window.innerHeight - anchorBottom + 8

  const renderPage = (pageIndex: 0 | 1) => {
    const boxes = textBoxes.filter(b => b.pageIndex === pageIndex)
    const images = imageBoxes.filter(b => b.pageIndex === pageIndex)
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
        {images.map(box => {
          const url = imageUrls.get(box.id)
          return url ? (
            <img
              key={box.id}
              src={url}
              draggable={false}
              style={{
                position: 'absolute',
                left: box.x * PREVIEW_PAGE_W,
                top: box.y * PREVIEW_PAGE_H,
                width: box.width * PREVIEW_PAGE_W,
                height: box.height * PREVIEW_PAGE_H,
                objectFit: 'fill',
              }}
            />
          ) : (
            <div
              key={box.id}
              style={{
                position: 'absolute',
                left: box.x * PREVIEW_PAGE_W,
                top: box.y * PREVIEW_PAGE_H,
                width: box.width * PREVIEW_PAGE_W,
                height: box.height * PREVIEW_PAGE_H,
                backgroundColor: '#d6cfc6',
                borderRadius: 1,
              }}
            />
          )
        })}
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
        pointerEvents: 'auto',
        zIndex: 9999,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {renderPage(0)}
      {renderPage(1)}
      {canDelete && onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(60,55,50,0.72)',
            color: '#fafaf7',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            lineHeight: 1,
          }}
          title="Delete spread"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>,
    document.body,
  )
}
