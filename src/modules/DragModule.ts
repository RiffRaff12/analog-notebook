interface SpreadRect {
  left: number
  top: number
  width: number
  height: number
}

interface PointerOrigin {
  clientX: number
  clientY: number
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v))
}

const DRAG_THRESHOLD_PX = 5

export class DragModule {
  private activeId: string | null = null
  private originX = 0
  private originY = 0
  private startClientX = 0
  private startClientY = 0
  private dragging = false
  private currentPos: { x: number; y: number } | null = null
  private onPositionChange: ((pos: { x: number; y: number }) => void) | null = null
  private spreadRect: SpreadRect

  constructor(spreadRect: SpreadRect) {
    this.spreadRect = spreadRect
  }

  startDrag(id: string, originX: number, originY: number, origin: PointerOrigin, onPositionChange?: (pos: { x: number; y: number }) => void): void {
    this.activeId = id
    this.originX = originX
    this.originY = originY
    this.startClientX = origin.clientX
    this.startClientY = origin.clientY
    this.dragging = false
    this.currentPos = { x: originX, y: originY }
    this.onPositionChange = onPositionChange ?? null
  }

  onDragMove(e: PointerEvent): void {
    if (!this.activeId) return

    const dx = e.clientX - this.startClientX
    const dy = e.clientY - this.startClientY

    if (!this.dragging) {
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD_PX) return
      this.dragging = true
    }

    const newX = clamp(this.originX + dx / this.spreadRect.width)
    const newY = clamp(this.originY + dy / this.spreadRect.height)
    this.currentPos = { x: newX, y: newY }
    this.onPositionChange?.(this.currentPos)
  }

  endDrag(): void {
    this.activeId = null
    this.dragging = false
    this.currentPos = null
    this.onPositionChange = null
  }

  isDragging(): boolean {
    return this.dragging
  }

  getCurrentPosition(): { x: number; y: number } | null {
    return this.currentPos
  }
}
