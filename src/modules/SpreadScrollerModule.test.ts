import { describe, it, expect } from 'vitest'
import { getPageRangeLabel, getScrollerWindow } from './SpreadScrollerModule'

describe('getPageRangeLabel', () => {
  it('returns "1–2" for the first spread', () => {
    expect(getPageRangeLabel(0)).toBe('1–2')
  })

  it('returns correct range for nth spread', () => {
    expect(getPageRangeLabel(1)).toBe('3–4')
    expect(getPageRangeLabel(2)).toBe('5–6')
    expect(getPageRangeLabel(9)).toBe('19–20')
  })
})

describe('getScrollerWindow', () => {
  it('centers on the active spread', () => {
    expect(getScrollerWindow(10, 5, 5)).toEqual([3, 4, 5, 6, 7])
  })

  it('clamps at the start when active spread is near index 0', () => {
    expect(getScrollerWindow(10, 1, 5)).toEqual([0, 1, 2, 3, 4])
  })

  it('clamps at the end when active spread is near the last', () => {
    expect(getScrollerWindow(10, 8, 5)).toEqual([5, 6, 7, 8, 9])
  })

  it('returns all spreads when total is less than window size', () => {
    expect(getScrollerWindow(3, 1, 5)).toEqual([0, 1, 2])
  })
})
