import { useEffect, useRef, useState } from 'react'
import { getPageRangeLabel } from '../modules'
import type { NotebookActions, NotebookState } from '../hooks/useNotebook'
import { SpreadPreview } from './SpreadPreview'

interface Props {
  state: NotebookState
  actions: NotebookActions
}

const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
const SCROLLER_H = isTouch ? 48 : 40
const PILL_H = isTouch ? 36 : 28
const PILL_RADIUS = PILL_H / 2
const ITEM_W = 64

export function SpreadScroller({ state, actions }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(window.innerWidth)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [hoverAnchor, setHoverAnchor] = useState<{ x: number; bottom: number } | null>(null)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleHide = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredIndex(null)
      setHoverAnchor(null)
    }, 120)
  }

  const cancelHide = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerWidth(el.offsetWidth)
    const ro = new ResizeObserver(() => setContainerWidth(el.offsetWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { spreads, currentSpread } = state
  const currentIndex = currentSpread?.index ?? 0
  const visibleSpreads = spreads
  const translateX = containerWidth / 2 - (currentIndex * ITEM_W + ITEM_W / 2)

  return (
    <div
      ref={containerRef}
      style={{
        height: SCROLLER_H,
        flexShrink: 0,
        zIndex: 10,
        background: 'rgba(245,240,232,0.92)',
        backdropFilter: 'blur(4px)',
        borderTop: '1px solid #e0d8cc',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          transform: `translateX(${translateX}px)`,
          transition: 'transform 250ms ease-in-out',
          willChange: 'transform',
        }}
      >
        {visibleSpreads.map((spread, i) => {
          const isActive = i === currentIndex
          return (
            <button
              key={spread.id}
              onClick={() => actions.goToSpread(i)}
              onMouseEnter={(e) => {
                cancelHide()
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setHoveredIndex(i)
                setHoverAnchor({ x: rect.left + rect.width / 2, bottom: rect.top })
              }}
              onMouseLeave={scheduleHide}
              style={{
                width: ITEM_W,
                flexShrink: 0,
                height: PILL_H,
                borderRadius: PILL_RADIUS,
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'Inter, system-ui, sans-serif',
                background: isActive ? '#44403c' : 'transparent',
                color: isActive ? '#fafaf7' : '#a8a29e',
                transition: 'background 150ms, color 150ms',
                padding: '0 8px',
                whiteSpace: 'nowrap',
              }}
            >
              {getPageRangeLabel(i)}
            </button>
          )
        })}
      </div>

      {hoveredIndex !== null && hoverAnchor && visibleSpreads[hoveredIndex] && (
        <SpreadPreview
          spread={visibleSpreads[hoveredIndex]}
          tbManager={state.tbManager}
          ibManager={state.ibManager}
          anchorX={hoverAnchor.x}
          anchorBottom={hoverAnchor.bottom}
          canDelete={visibleSpreads.length > 1}
          onDelete={() => {
            const id = visibleSpreads[hoveredIndex].id
            setHoveredIndex(null)
            setHoverAnchor(null)
            actions.deleteSpread(id)
          }}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        />
      )}
    </div>
  )
}
