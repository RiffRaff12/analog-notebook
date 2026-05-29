import { useRef, useEffect, useCallback } from 'react'
import type { TextBox } from '../modules'
import type { NotebookActions } from '../hooks/useNotebook'
import { DragModule } from '../modules'
import type { TextBoxManager } from '../modules/TextBoxManager'

interface Props {
  box: TextBox
  pageWidth: number
  pageHeight: number
  isSelected: boolean
  isEditing: boolean
  anyBoxEditing: boolean
  actions: NotebookActions
  onRectChange: (id: string, rect: DOMRect) => void
  tbManager: TextBoxManager
  spreadRect: DOMRect | null
}

export function TextBoxComponent({
  box,
  pageWidth,
  pageHeight,
  isSelected,
  isEditing,
  anyBoxEditing,
  actions,
  onRectChange,
  tbManager,
  spreadRect,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragModule | null>(null)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      onRectChange(box.id, rect)
    }
  })

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      if (isEditing) return

      // Another box is currently being edited — keep the keyboard open by
      // preventing the browser from blurring that textarea, then immediately
      // switch edit mode to this box (skip drag, which isn't useful mid-edit).
      if (anyBoxEditing) {
        e.preventDefault()
        actions.enterEditMode(box.id)
        return
      }

      if (!spreadRect) {
        // No geometry yet — fall back to select or edit
        if (!isSelected) actions.selectBox(box.id)
        else actions.enterEditMode(box.id)
        return
      }

      // Select immediately so z-index is elevated during drag
      if (!isSelected) actions.selectBox(box.id)

      const spreadWidth = pageWidth * 2
      // Convert to spread-relative origin: left page occupies [0, 0.5], right page [0.5, 1]
      const spreadOriginX = box.pageIndex === 0 ? box.x / 2 : 0.5 + box.x / 2

      const drag = new DragModule({ left: spreadRect.left, top: spreadRect.top, width: spreadWidth, height: pageHeight })
      drag.startDrag(box.id, spreadOriginX, box.y, { clientX: e.clientX, clientY: e.clientY }, (pos) => {
        const el = containerRef.current
        if (el) {
          // Map spread-relative x back to pixels within this page div
          el.style.left = `${(pos.x - box.pageIndex * 0.5) * spreadWidth}px`
          el.style.top = `${pos.y * pageHeight}px`
          onRectChange(box.id, el.getBoundingClientRect())
        }
      })
      dragRef.current = drag

      const handleMove = (me: PointerEvent) => {
        drag.onDragMove(me)
      }

      const handleUp = async () => {
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)

        if (drag.isDragging()) {
          const finalPos = drag.getCurrentPosition()
          drag.endDrag()
          if (finalPos) {
            const newPageIndex: 0 | 1 = finalPos.x < 0.5 ? 0 : 1
            const newX = newPageIndex === 0 ? finalPos.x * 2 : (finalPos.x - 0.5) * 2
            await actions.moveTextBox(box.id, newX, finalPos.y, newPageIndex)
          }
        } else {
          // tap (< 5px movement) → enter edit mode
          await actions.enterEditMode(box.id)
        }
        dragRef.current = null
      }

      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
    },
    [isSelected, isEditing, anyBoxEditing, actions, box, spreadRect, tbManager, pageWidth, pageHeight],
  )

  const left = box.x * pageWidth
  const top = box.y * pageHeight
  const maxWidth = pageWidth - left

  const fontSizeMap = { 12: '12px', 16: '16px', 20: '20px' } as const

  return (
    <div
      ref={containerRef}
      className="absolute cursor-pointer group"
      style={{
        left,
        top,
        maxWidth,
        minWidth: 40,
        opacity: box.isStruck ? 0.45 : 1,
        outline: isSelected && !isEditing && box.content.trim() !== '' ? '1.5px solid #a8a29e' : 'none',
        outlineOffset: 2,
        borderRadius: 2,
        zIndex: isSelected ? 50 : undefined,
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="bg-transparent border-none outline-none resize-none font-[Caveat] text-stone-800 w-full"
          style={{
            fontSize: fontSizeMap[box.fontSize],
            textDecoration: box.isStruck ? 'line-through' : 'none',
            width: maxWidth,
            minHeight: '1.4em',
            lineHeight: 1.4,
          }}
          value={box.content}
          onChange={(e) => actions.updateContent(box.id, e.target.value)}
          onBlur={() => actions.blurTextBox(box.id, box.content)}
        />
      ) : (
        <div
          className="font-[Caveat] text-stone-800 whitespace-pre-wrap break-words"
          style={{
            fontSize: fontSizeMap[box.fontSize],
            textDecoration: box.isStruck ? 'line-through' : 'none',
            lineHeight: 1.4,
            minHeight: '1.4em',
            minWidth: 20,
          }}
        >
          {box.content || '\u00A0'}
        </div>
      )}
    </div>
  )
}
