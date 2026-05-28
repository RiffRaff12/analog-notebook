import { describe, it, expect } from 'vitest'
import { getScaleProps } from './PageScaler'

// A5 dimensions in mm: 148 x 210. Spread = 296 x 210.
// We use ratio: spreadAspect = 296/210 ≈ 1.4095

describe('PageScaler', () => {
  it('returns scale and offset for a landscape viewport', () => {
    const result = getScaleProps(1440, 900)
    expect(result.scale).toBeGreaterThan(0)
    expect(result.spreadWidth).toBeLessThanOrEqual(1440)
    expect(result.spreadHeight).toBeLessThanOrEqual(900)
    expect(result.offsetX).toBeGreaterThanOrEqual(0)
    expect(result.offsetY).toBeGreaterThanOrEqual(0)
  })

  it('never exceeds viewport dimensions', () => {
    const viewports = [
      [1440, 900],
      [768, 1024],
      [500, 500],
      [320, 568],
      [2560, 1440],
    ]
    for (const [w, h] of viewports) {
      const result = getScaleProps(w, h)
      expect(result.spreadWidth).toBeLessThanOrEqual(w + 0.001)
      expect(result.spreadHeight).toBeLessThanOrEqual(h + 0.001)
    }
  })

  it('centers the spread in the viewport', () => {
    const result = getScaleProps(1440, 900)
    const expectedX = (1440 - result.spreadWidth) / 2
    const expectedY = (900 - result.spreadHeight) / 2
    expect(result.offsetX).toBeCloseTo(expectedX, 1)
    expect(result.offsetY).toBeCloseTo(expectedY, 1)
  })

  it('scales proportionally — same aspect ratio as A5×2', () => {
    const A5_SPREAD_ASPECT = 296 / 210
    const result = getScaleProps(1440, 900)
    const resultAspect = result.spreadWidth / result.spreadHeight
    expect(resultAspect).toBeCloseTo(A5_SPREAD_ASPECT, 2)
  })

  it('handles a portrait viewport (taller than wide)', () => {
    const result = getScaleProps(768, 1024)
    expect(result.spreadWidth).toBeLessThanOrEqual(768 + 0.001)
    expect(result.spreadHeight).toBeLessThanOrEqual(1024 + 0.001)
    expect(result.scale).toBeGreaterThan(0)
  })

  it('handles a square viewport', () => {
    const result = getScaleProps(800, 800)
    expect(result.spreadWidth).toBeLessThanOrEqual(800 + 0.001)
    expect(result.spreadHeight).toBeLessThanOrEqual(800 + 0.001)
    expect(result.scale).toBeGreaterThan(0)
  })

  it('scale equals spreadWidth divided by base spread width', () => {
    const BASE_SPREAD_WIDTH = 296
    const result = getScaleProps(1000, 700)
    expect(result.scale).toBeCloseTo(result.spreadWidth / BASE_SPREAD_WIDTH, 5)
  })
})
