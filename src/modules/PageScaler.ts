// A5: 148mm × 210mm. Two-page spread: 296mm × 210mm.
const BASE_SPREAD_WIDTH = 296
const BASE_SPREAD_HEIGHT = 210

export interface ScaleProps {
  scale: number
  spreadWidth: number
  spreadHeight: number
  offsetX: number
  offsetY: number
}

export function getScaleProps(viewportWidth: number, viewportHeight: number): ScaleProps {
  const scaleX = viewportWidth / BASE_SPREAD_WIDTH
  const scaleY = viewportHeight / BASE_SPREAD_HEIGHT
  const scale = Math.min(scaleX, scaleY)

  const spreadWidth = BASE_SPREAD_WIDTH * scale
  const spreadHeight = BASE_SPREAD_HEIGHT * scale
  const offsetX = (viewportWidth - spreadWidth) / 2
  const offsetY = (viewportHeight - spreadHeight) / 2

  return { scale, spreadWidth, spreadHeight, offsetX, offsetY }
}
