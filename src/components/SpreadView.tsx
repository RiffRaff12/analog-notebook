import { useRef, useState, useCallback, useEffect } from 'react'
import type { TextBox } from '../modules'
import { getScaleProps } from '../modules'
import type { NotebookActions, NotebookState } from '../hooks/useNotebook'
import { TextBoxManager } from '../modules/TextBoxManager'
import { TextBoxComponent } from './TextBoxComponent'
import { Toolbar } from './Toolbar'

interface Props {
  state: NotebookState
  actions: NotebookActions
  tbManager: TextBoxManager
}

export function SpreadView({ state, actions, tbManager }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const spreadRef = useRef<HTMLDivElement>(null)
  const SCROLLER_H = 40
  const [viewportSize, setViewportSize] = useState({ w: window.innerWidth, h: window.innerHeight - SCROLLER_H })
  const [boxRects, setBoxRects] = useState<Map<string, DOMRect>>(new Map())

  useEffect(() => {
    const onResize = () => setViewportSize({ w: window.innerWidth, h: window.innerHeight - SCROLLER_H })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const scaleProps = getScaleProps(viewportSize.w, viewportSize.h)
  const { scale, spreadWidth, spreadHeight, offsetX, offsetY } = scaleProps
  const pageWidth = spreadWidth / 2
  const pageHeight = spreadHeight

  const handleSpreadPointerDown = useCallback(
    async (e: React.PointerEvent, pageIndex: 0 | 1) => {
      const target = e.target as Element
      if (target.closest('[data-textbox]')) return

      const pageEl = (e.currentTarget as HTMLElement)
      const rect = pageEl.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height

      if (state.selectedId) {
        actions.deselectBox()
        return
      }

      const tb = await actions.createTextBox(pageIndex, x, y)
      if (tb) {
        actions.enterEditMode(tb.id)
      }
    },
    [state.selectedId, actions],
  )

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
          cursor: 'text',
          borderLeft: pageIndex === 1 ? '1px solid #e0d8cc' : undefined,
        }}
        onPointerDown={(e) => handleSpreadPointerDown(e, pageIndex)}
      >
        {/* Paper texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
            opacity: 0.6,
          }}
        />
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
              className="opacity-20 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center text-stone-500 hover:text-stone-800"
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
            className="opacity-20 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center text-stone-500 hover:text-stone-800"
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

    </div>
  )
}
