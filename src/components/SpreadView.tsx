import { useRef, useState, useCallback, useEffect } from 'react'
import type { TextBox } from '../modules'
import { getScaleProps } from '../modules'
import type { NotebookActions, NotebookState } from '../hooks/useNotebook'
import { TextBoxManager } from '../modules/TextBoxManager'
import { TextBoxComponent } from './TextBoxComponent'
import { ImageBoxComponent } from './ImageBoxComponent'
import { Toolbar } from './Toolbar'

interface Props {
  state: NotebookState
  actions: NotebookActions
  tbManager: TextBoxManager
}

interface ContextMenuState {
  x: number
  y: number
  pageIndex: 0 | 1
  pageX: number
  pageY: number
  hasImage: boolean
}

const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
const SCROLLER_H = isTouch ? 48 : 40

export function SpreadView({ state, actions, tbManager }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const spreadRef = useRef<HTMLDivElement>(null)
  const [viewportSize, setViewportSize] = useState({ w: window.innerWidth, h: window.innerHeight - SCROLLER_H })
  const [boxRects, setBoxRects] = useState<Map<string, DOMRect>>(new Map())
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const editingIdRef = useRef(state.editingId)

  useEffect(() => { editingIdRef.current = state.editingId }, [state.editingId])

  useEffect(() => {
    const onResize = () => {
      if (editingIdRef.current) return
      setViewportSize({ w: window.innerWidth, h: window.innerHeight - SCROLLER_H })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const dismiss = () => setContextMenu(null)
    window.addEventListener('pointerdown', dismiss)
    return () => window.removeEventListener('pointerdown', dismiss)
  }, [])

  const scaleProps = getScaleProps(viewportSize.w, viewportSize.h)
  const { scale, spreadWidth, spreadHeight, offsetX, offsetY } = scaleProps
  const pageWidth = spreadWidth / 2
  const pageHeight = spreadHeight

  const handleSpreadPointerDown = useCallback(
    (e: React.PointerEvent, pageIndex: 0 | 1) => {
      const target = e.target as Element
      if (target.closest('[data-textbox]') || target.closest('[data-imagebox]')) return

      if (state.selectedId) { actions.deselectBox(); return }
      if (state.selectedImageId) { actions.deselectImageBox(); return }

      const pageEl = e.currentTarget as HTMLElement
      const rect = pageEl.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height

      const createHere = async () => {
        const tb = await actions.createTextBox(pageIndex, x, y)
        if (tb) actions.enterEditMode(tb.id)
      }

      if (!isTouch) {
        createHere()
        return
      }

      // Touch: distinguish tap / swipe / long-press
      const startX = e.clientX
      const startY = e.clientY
      let gestureType: 'pending' | 'swipe' | 'longpress' | 'cancelled' = 'pending'

      const longPressTimer = setTimeout(() => {
        if (gestureType !== 'pending') return
        gestureType = 'longpress'
        const showMenu = (hasImage: boolean) =>
          setContextMenu({ x: startX, y: startY, pageIndex, pageX: x, pageY: y, hasImage })
        navigator.clipboard.read()
          .then(items => showMenu(items.some(item => item.types.some(t => t.startsWith('image/')))))
          .catch(() => showMenu(false))
      }, 600)

      const cleanup = () => {
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)
        window.removeEventListener('pointercancel', handleCancel)
        clearTimeout(longPressTimer)
      }

      const handleMove = (me: PointerEvent) => {
        if (gestureType !== 'pending') return
        const dx = me.clientX - startX
        const dy = me.clientY - startY
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          clearTimeout(longPressTimer)
          if (Math.abs(dx) > 50 && Math.abs(dy) < 60) {
            gestureType = 'swipe'
            if (dx < 0) actions.goToNext()
            else actions.goToPrev()
          } else {
            gestureType = 'cancelled'
          }
        }
      }

      const handleUp = () => {
        cleanup()
        if (gestureType === 'pending') createHere()
      }

      const handleCancel = () => cleanup()

      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
      window.addEventListener('pointercancel', handleCancel)
    },
    [state.selectedId, state.selectedImageId, actions],
  )

  const handleContextMenu = useCallback(
    async (e: React.MouseEvent, pageIndex: 0 | 1) => {
      e.preventDefault()
      if (isTouch) return
      const pageEl = e.currentTarget as HTMLElement
      const rect = pageEl.getBoundingClientRect()
      const pageX = (e.clientX - rect.left) / rect.width
      const pageY = (e.clientY - rect.top) / rect.height

      let hasImage = false
      try {
        const items = await navigator.clipboard.read()
        hasImage = items.some(item => item.types.some(t => t.startsWith('image/')))
      } catch {
        // Clipboard API not permitted or no items
      }

      setContextMenu({ x: e.clientX, y: e.clientY, pageIndex, pageX, pageY, hasImage })
    },
    [],
  )

  const handlePasteImage = useCallback(async () => {
    if (!contextMenu) return
    setContextMenu(null)
    try {
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith('image/'))
        if (!imageType) continue
        const blob = await item.getType(imageType)
        const img = new Image()
        const url = URL.createObjectURL(blob)
        await new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.src = url
        })
        await actions.pasteImageBox(
          contextMenu.pageIndex,
          contextMenu.pageX,
          contextMenu.pageY,
          blob,
          img.naturalWidth,
          img.naturalHeight,
        )
        URL.revokeObjectURL(url)
        break
      }
    } catch {
      // Clipboard read failed
    }
  }, [contextMenu, actions])

  const handleRectChange = useCallback((id: string, rect: DOMRect) => {
    setBoxRects(prev => {
      const next = new Map(prev)
      next.set(id, rect)
      return next
    })
  }, [])

  const selectedBox = state.textBoxes.find(b => b.id === state.selectedId) ?? null
  const spreadRect = spreadRef.current?.getBoundingClientRect() ?? null

  const renderPage = (pageIndex: 0 | 1) => {
    const pageBoxes = state.textBoxes.filter(b => b.pageIndex === pageIndex)
    const pageImages = state.imageBoxes.filter(b => b.pageIndex === pageIndex)
    const pageNum = state.currentSpread
      ? state.currentSpread.index * 2 + 1 + pageIndex
      : pageIndex + 1

    return (
      <div
        key={pageIndex}
        className="relative select-none"
        style={{
          width: pageWidth,
          height: pageHeight,
          backgroundImage: `radial-gradient(circle, #c8bfb0 1px, transparent 1px)`,
          backgroundSize: `${5 * scale}px ${5 * scale}px`,
          backgroundPosition: `${2.5 * scale}px ${2.5 * scale}px`,
          backgroundColor: '#FAFAF7',
          cursor: isTouch ? 'default' : 'text',
          borderLeft: pageIndex === 1 ? '1px solid #e0d8cc' : undefined,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onPointerDown={(e) => handleSpreadPointerDown(e, pageIndex)}
        onContextMenu={(e) => handleContextMenu(e, pageIndex)}
      >
        {/* Paper texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
            opacity: 0.6,
          }}
        />
        {/* Image boxes */}
        {pageImages.map(box => (
          <div key={box.id} data-imagebox="true">
            <ImageBoxComponent
              box={box}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              isSelected={state.selectedImageId === box.id}
              actions={actions}
              spreadRect={spreadRect}
            />
          </div>
        ))}
        {/* Text boxes */}
        {pageBoxes.map((box: TextBox) => (
          <div key={box.id} data-textbox="true">
            <TextBoxComponent
              box={box}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              isSelected={state.selectedId === box.id}
              isEditing={state.editingId === box.id}
              actions={actions}
              onRectChange={handleRectChange}
              tbManager={tbManager}
              spreadRect={spreadRect}
            />
          </div>
        ))}
        {/* Page number */}
        <div
          className="absolute text-stone-400"
          style={{
            fontSize: 16,
            bottom: 12,
            [pageIndex === 0 ? 'left' : 'right']: 24,
          }}
        >
          {pageNum}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ background: '#F5F0E8' }}
    >
      {/* Spread container with slide animation */}
      <div
        key={state.navigationCount}
        ref={spreadRef}
        className="absolute flex shadow-2xl"
        style={{
          left: offsetX,
          top: offsetY,
          width: spreadWidth,
          height: spreadHeight,
          borderRadius: 2 * scale,
          overflow: 'hidden',
          animation: state.navigationDirection
            ? `slide-in-${state.navigationDirection} 250ms ease-in-out`
            : undefined,
        }}
      >
        {renderPage(0)}
        {renderPage(1)}

        {/* Left chevron hover zone */}
        {state.canGoPrev && (
          <div className="absolute left-0 top-0 h-full flex items-center group" style={{ width: 48 }}>
            <button
              className={`${isTouch ? 'opacity-60' : 'opacity-20 group-hover:opacity-100'} transition-opacity duration-150 flex items-center justify-center text-stone-500 hover:text-stone-800`}
              style={{ padding: 8, fontSize: 48, background: 'rgba(255,255,255,0.6)', borderRadius: '0 4px 4px 0', backdropFilter: 'blur(2px)', lineHeight: 1 }}
              onClick={(e) => { e.stopPropagation(); actions.goToPrev() }}
              aria-label="Previous spread"
            >
              ‹
            </button>
          </div>
        )}

        {/* Right chevron — always visible, creates new spread at end */}
        <div className="absolute right-0 top-0 h-full flex items-center justify-end group" style={{ width: 48 }}>
          <button
            className={`${isTouch ? 'opacity-60' : 'opacity-20 group-hover:opacity-100'} transition-opacity duration-150 flex items-center justify-center text-stone-500 hover:text-stone-800`}
            style={{ padding: 8, fontSize: 48, background: 'rgba(255,255,255,0.6)', borderRadius: '4px 0 0 4px', backdropFilter: 'blur(2px)', lineHeight: 1 }}
            onClick={(e) => { e.stopPropagation(); actions.goToNext() }}
            aria-label="Next spread"
          >
            ›
          </button>
        </div>
      </div>

      {/* Floating toolbar */}
      {selectedBox && (
        <Toolbar
          box={selectedBox}
          actions={actions}
          anchorRect={boxRects.get(selectedBox.id) ?? null}
          spreadRect={spreadRect}
          containerRect={containerRef.current?.getBoundingClientRect() ?? null}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-stone-200 rounded shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y, minWidth: 140 }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 text-sm hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
            style={{ minHeight: isTouch ? 44 : 32 }}
            disabled={!contextMenu.hasImage}
            onClick={handlePasteImage}
          >
            Paste Image
          </button>
        </div>
      )}
    </div>
  )
}
