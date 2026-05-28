// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { DragModule } from './DragModule'

// spreadWidth = 1000px (two pages, each 500px wide), spreadHeight = 700px
const SPREAD_RECT = { left: 220, top: 50, width: 1000, height: 700 }

function makePointerEvent(clientX: number, clientY: number): PointerEvent {
  return new PointerEvent('pointermove', { clientX, clientY, bubbles: true })
}

describe('DragModule — 5px threshold', () => {
  it('does not start drag if pointer moves less than 5px', () => {
    const drag = new DragModule(SPREAD_RECT)
    drag.startDrag('id', 0.25, 0.5, { clientX: 500, clientY: 350 })
    drag.onDragMove(makePointerEvent(502, 351))
    expect(drag.isDragging()).toBe(false)
  })

  it('starts drag after pointer moves more than 5px', () => {
    const drag = new DragModule(SPREAD_RECT)
    drag.startDrag('id', 0.25, 0.5, { clientX: 500, clientY: 350 })
    drag.onDragMove(makePointerEvent(506, 350))
    expect(drag.isDragging()).toBe(true)
  })

  it('pointer movement under 5px is not a drag', () => {
    const drag = new DragModule(SPREAD_RECT)
    drag.startDrag('id', 0.25, 0.5, { clientX: 500, clientY: 350 })
    drag.onDragMove(makePointerEvent(503, 352)) // sqrt(9+4) ≈ 3.6px
    expect(drag.isDragging()).toBe(false)
  })
})

describe('DragModule — position translation (spread-relative coords)', () => {
  it('translates pointer delta to spread-relative position', () => {
    const drag = new DragModule(SPREAD_RECT)
    // Box at spread-relative x=0.5 (center of spread), y=0.5
    drag.startDrag('id', 0.5, 0.5, { clientX: 500, clientY: 350 })
    // Move 100px right, 70px down → 100/1000 = 0.1 x, 70/700 = 0.1 y
    drag.onDragMove(makePointerEvent(600, 420))
    const pos = drag.getCurrentPosition()
    expect(pos!.x).toBeCloseTo(0.6, 2)
    expect(pos!.y).toBeCloseTo(0.6, 2)
  })

  it('can drag from left page into right page (x crosses 0.5)', () => {
    const drag = new DragModule(SPREAD_RECT)
    // Box at spread-relative x=0.25 (center of left page), y=0.5
    drag.startDrag('id', 0.25, 0.5, { clientX: 400, clientY: 350 })
    // Move 400px right → 400/1000 = 0.4, new x = 0.65 (right page)
    drag.onDragMove(makePointerEvent(800, 350))
    const pos = drag.getCurrentPosition()
    expect(pos!.x).toBeGreaterThan(0.5)
    expect(pos!.x).toBeCloseTo(0.65, 2)
  })
})

describe('DragModule — clamping', () => {
  it('clamps x to [0, 1] at right edge of spread', () => {
    const drag = new DragModule(SPREAD_RECT)
    drag.startDrag('id', 0.5, 0.5, { clientX: 500, clientY: 350 })
    drag.onDragMove(makePointerEvent(1500, 350))
    const pos = drag.getCurrentPosition()
    expect(pos!.x).toBeLessThanOrEqual(1)
    expect(pos!.x).toBeGreaterThanOrEqual(0)
  })

  it('clamps y to [0, 1] at top edge', () => {
    const drag = new DragModule(SPREAD_RECT)
    drag.startDrag('id', 0.5, 0.5, { clientX: 500, clientY: 350 })
    drag.onDragMove(makePointerEvent(500, -500))
    const pos = drag.getCurrentPosition()
    expect(pos!.y).toBeGreaterThanOrEqual(0)
  })
})

describe('DragModule — endDrag', () => {
  it('isDragging is false after endDrag', () => {
    const drag = new DragModule(SPREAD_RECT)
    drag.startDrag('id', 0.5, 0.5, { clientX: 500, clientY: 350 })
    drag.onDragMove(makePointerEvent(600, 420))
    drag.endDrag()
    expect(drag.isDragging()).toBe(false)
  })

  it('getCurrentPosition returns null after endDrag', () => {
    const drag = new DragModule(SPREAD_RECT)
    drag.startDrag('id', 0.5, 0.5, { clientX: 500, clientY: 350 })
    drag.onDragMove(makePointerEvent(600, 420))
    drag.endDrag()
    expect(drag.getCurrentPosition()).toBeNull()
  })
})

describe('DragModule — onPositionChange callback', () => {
  it('calls onPositionChange on each drag move past threshold', () => {
    const drag = new DragModule(SPREAD_RECT)
    const positions: Array<{ x: number; y: number }> = []
    drag.startDrag('id', 0.5, 0.5, { clientX: 500, clientY: 350 }, (pos) => positions.push(pos))
    drag.onDragMove(makePointerEvent(506, 350))
    drag.onDragMove(makePointerEvent(512, 350))
    expect(positions).toHaveLength(2)
  })

  it('does not call onPositionChange when movement is under threshold', () => {
    const drag = new DragModule(SPREAD_RECT)
    let called = false
    drag.startDrag('id', 0.5, 0.5, { clientX: 500, clientY: 350 }, () => { called = true })
    drag.onDragMove(makePointerEvent(502, 350))
    expect(called).toBe(false)
  })

  it('callback receives updated spread-relative position on each move', () => {
    const drag = new DragModule(SPREAD_RECT)
    const positions: Array<{ x: number; y: number }> = []
    drag.startDrag('id', 0.5, 0.5, { clientX: 500, clientY: 350 }, (pos) => positions.push({ ...pos }))
    drag.onDragMove(makePointerEvent(600, 420))
    expect(positions[0].x).toBeCloseTo(0.6, 2)
    expect(positions[0].y).toBeCloseTo(0.6, 2)
  })

  it('no callback does not throw when none provided', () => {
    const drag = new DragModule(SPREAD_RECT)
    drag.startDrag('id', 0.5, 0.5, { clientX: 500, clientY: 350 })
    expect(() => drag.onDragMove(makePointerEvent(600, 420))).not.toThrow()
  })
})
