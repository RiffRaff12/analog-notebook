import { useEffect, useRef, useState } from 'react'
import { getPageRangeLabel } from '../modules'
import type { NotebookActions, NotebookState } from '../hooks/useNotebook'
import { SpreadPreview } from './SpreadPreview'

interface Props {
  state: NotebookState
  actions: NotebookActions
}

const ITEM_W = 64

export function SpreadScroller({ state, actions }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(window.innerWidth)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [hoverAnchor, setHoverAnchor] = useState<{ x: number; bottom: number } | null>(null)

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
  const visibleSpreads = spreads.filter(s => s.index <= currentIndex)
  const translateX = containerWidth / 2 - (currentIndex * ITEM_W + ITEM_W / 2)

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
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
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setHoveredIndex(i)
                setHoverAnchor({ x: rect.left + rect.width / 2, bottom: rect.top })
              }}
              onMouseLeave={() => {
                setHoveredIndex(null)
                setHoverAnchor(null)
              }}
              style={{
                width: ITEM_W,
                flexShrink: 0,
                height: 28,
                borderRadius: 14,
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
          anchorX={hoverAnchor.x}
          anchorBottom={hoverAnchor.bottom}
        />
      )}
    </div>
  )
}
