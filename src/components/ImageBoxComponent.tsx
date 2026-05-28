import { useEffect, useRef, useState, useCallback } from 'react'
import type { ImageBox } from '../modules'
import type { NotebookActions } from '../hooks/useNotebook'

interface Props {
  box: ImageBox
  pageWidth: number
  pageHeight: number
  isSelected: boolean
  actions: NotebookActions
}

type HandleDir = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'

const HANDLE_CURSORS: Record<HandleDir, string> = {
  n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize',
  nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize',
}

export function ImageBoxComponent({ box, pageWidth, pageHeight, isSelected, actions }: Props) {
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

      const startX = e.clientX
      const startY = e.clientY
      const origX = box.x
      const origY = box.y

      const handleMove = (me: PointerEvent) => {
        const dx = (me.clientX - startX) / pageWidth
        const dy = (me.clientY - startY) / pageHeight
        const newX = Math.max(0, Math.min(1 - box.width, origX + dx))
        const newY = Math.max(0, Math.min(1 - box.height, origY + dy))
        if (imgRef.current) {
          imgRef.current.parentElement!.style.left = `${newX * pageWidth}px`
          imgRef.current.parentElement!.style.top = `${newY * pageHeight}px`
        }
      }

      const handleUp = async (ue: PointerEvent) => {
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)
        const dx = (ue.clientX - startX) / pageWidth
        const dy = (ue.clientY - startY) / pageHeight
        if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) {
          const newX = Math.max(0, Math.min(1 - box.width, origX + dx))
          const newY = Math.max(0, Math.min(1 - box.height, origY + dy))
          await actions.moveImageBox(box.id, newX, newY)
        }
      }

      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
    },
    [box, pageWidth, pageHeight, actions],
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
    { dir: 'nw', style: { top: -4, left: -4 } },
    { dir: 'n',  style: { top: -4, left: '50%', transform: 'translateX(-50%)' } },
    { dir: 'ne', style: { top: -4, right: -4 } },
    { dir: 'e',  style: { top: '50%', right: -4, transform: 'translateY(-50%)' } },
    { dir: 'se', style: { bottom: -4, right: -4 } },
    { dir: 's',  style: { bottom: -4, left: '50%', transform: 'translateX(-50%)' } },
    { dir: 'sw', style: { bottom: -4, left: -4 } },
    { dir: 'w',  style: { top: '50%', left: -4, transform: 'translateY(-50%)' } },
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
            width: 8,
            height: 8,
            cursor: HANDLE_CURSORS[dir],
            ...style,
          }}
          onPointerDown={(e) => handleResizePointerDown(e, dir)}
        />
      ))}
    </div>
  )
}
