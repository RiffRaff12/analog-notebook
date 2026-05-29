import { useEffect, useRef, useState, useCallback } from 'react'
import type { ImageBox } from '../modules'
import { DragModule } from '../modules'
import type { NotebookActions } from '../hooks/useNotebook'

const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
const HANDLE_SIZE = isTouch ? 20 : 8
const HANDLE_OFF = HANDLE_SIZE / 2

interface Props {
  box: ImageBox
  pageWidth: number
  pageHeight: number
  isSelected: boolean
  actions: NotebookActions
  spreadRect: DOMRect | null
}

type HandleDir = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'

const HANDLE_CURSORS: Record<HandleDir, string> = {
  n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize',
  nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize',
}

export function ImageBoxComponent({ box, pageWidth, pageHeight, isSelected, actions, spreadRect }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(box.imageData)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [box.imageData])

  const left = box.x * pageWidth
  const top = box.y * pageHeight
  const width = box.width * pageWidth
  const height = box.height * pageHeight

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      actions.selectImageBox(box.id)

      if (!spreadRect) return

      const spreadWidth = pageWidth * 2
      const spreadOriginX = box.pageIndex === 0 ? box.x / 2 : 0.5 + box.x / 2

      const drag = new DragModule({ left: spreadRect.left, top: spreadRect.top, width: spreadWidth, height: pageHeight })
      drag.startDrag(box.id, spreadOriginX, box.y, { clientX: e.clientX, clientY: e.clientY }, (pos) => {
        const el = imgRef.current?.parentElement
        if (el) {
          el.style.left = `${(pos.x - box.pageIndex * 0.5) * spreadWidth}px`
          el.style.top = `${pos.y * pageHeight}px`
        }
      })

      const handleMove = (me: PointerEvent) => drag.onDragMove(me)

      const handleUp = async () => {
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)

        if (drag.isDragging()) {
          const finalPos = drag.getCurrentPosition()
          drag.endDrag()
          if (finalPos) {
            const newPageIndex: 0 | 1 = finalPos.x < 0.5 ? 0 : 1
            const newX = newPageIndex === 0 ? finalPos.x * 2 : (finalPos.x - 0.5) * 2
            await actions.moveImageBox(box.id, newX, finalPos.y, newPageIndex)
          }
        }
      }

      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
    },
    [box, pageWidth, pageHeight, actions, spreadRect],
  )

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, dir: HandleDir) => {
      e.stopPropagation()
      e.preventDefault()

      const startX = e.clientX
      const startY = e.clientY
      const origX = box.x
      const origY = box.y
      const origW = box.width
      const origH = box.height

      const handleMove = (me: PointerEvent) => {
        const dx = (me.clientX - startX) / pageWidth
        const dy = (me.clientY - startY) / pageHeight

        let x = origX, y = origY, w = origW, h = origH
        const MIN = 0.04

        if (dir.includes('e')) w = Math.max(MIN, Math.min(1 - origX, origW + dx))
        if (dir.includes('s')) h = Math.max(MIN, Math.min(1 - origY, origH + dy))
        if (dir.includes('w')) {
          const newX = Math.max(0, Math.min(origX + origW - MIN, origX + dx))
          w = origX + origW - newX
          x = newX
        }
        if (dir.includes('n')) {
          const newY = Math.max(0, Math.min(origY + origH - MIN, origY + dy))
          h = origY + origH - newY
          y = newY
        }

        const el = imgRef.current?.parentElement
        if (el) {
          el.style.left = `${x * pageWidth}px`
          el.style.top = `${y * pageHeight}px`
          el.style.width = `${w * pageWidth}px`
          el.style.height = `${h * pageHeight}px`
        }
      }

      const handleUp = async (ue: PointerEvent) => {
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)

        const dx = (ue.clientX - startX) / pageWidth
        const dy = (ue.clientY - startY) / pageHeight
        let x = origX, y = origY, w = origW, h = origH
        const MIN = 0.04

        if (dir.includes('e')) w = Math.max(MIN, Math.min(1 - origX, origW + dx))
        if (dir.includes('s')) h = Math.max(MIN, Math.min(1 - origY, origH + dy))
        if (dir.includes('w')) {
          const newX = Math.max(0, Math.min(origX + origW - MIN, origX + dx))
          w = origX + origW - newX
          x = newX
        }
        if (dir.includes('n')) {
          const newY = Math.max(0, Math.min(origY + origH - MIN, origY + dy))
          h = origY + origH - newY
          y = newY
        }

        await actions.moveImageBox(box.id, x, y)
        await actions.resizeImageBox(box.id, w, h)
      }

      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
    },
    [box, pageWidth, pageHeight, actions],
  )

  const handles: { dir: HandleDir; style: React.CSSProperties }[] = [
    { dir: 'nw', style: { top: -HANDLE_OFF, left: -HANDLE_OFF } },
    { dir: 'n',  style: { top: -HANDLE_OFF, left: '50%', transform: 'translateX(-50%)' } },
    { dir: 'ne', style: { top: -HANDLE_OFF, right: -HANDLE_OFF } },
    { dir: 'e',  style: { top: '50%', right: -HANDLE_OFF, transform: 'translateY(-50%)' } },
    { dir: 'se', style: { bottom: -HANDLE_OFF, right: -HANDLE_OFF } },
    { dir: 's',  style: { bottom: -HANDLE_OFF, left: '50%', transform: 'translateX(-50%)' } },
    { dir: 'sw', style: { bottom: -HANDLE_OFF, left: -HANDLE_OFF } },
    { dir: 'w',  style: { top: '50%', left: -HANDLE_OFF, transform: 'translateY(-50%)' } },
  ]

  return (
    <div
      className="absolute"
      style={{
        left,
        top,
        width,
        height,
        zIndex: isSelected ? 50 : 1,
        cursor: isSelected ? 'move' : 'pointer',
        outline: isSelected ? '1.5px solid #a8a29e' : 'none',
        outlineOffset: 2,
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
    >
      {objectUrl && (
        <img
          ref={imgRef}
          src={objectUrl}
          draggable={false}
          className="w-full h-full"
          style={{ display: 'block', objectFit: 'fill', userSelect: 'none' }}
        />
      )}

      {isSelected && handles.map(({ dir, style }) => (
        <div
          key={dir}
          className="absolute bg-white border border-stone-400 rounded-sm"
          style={{
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            cursor: HANDLE_CURSORS[dir],
            touchAction: 'none',
            ...style,
          }}
          onPointerDown={(e) => handleResizePointerDown(e, dir)}
        />
      ))}
    </div>
  )
}
