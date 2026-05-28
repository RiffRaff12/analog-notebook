export function getPageRangeLabel(spreadIndex: number): string {
  const left = spreadIndex * 2 + 1
  return `${left}–${left + 1}`
}

export function getScrollerWindow(totalSpreads: number, currentIndex: number, windowSize: number): number[] {
  const half = Math.floor(windowSize / 2)
  let start = currentIndex - half
  let end = start + windowSize

  if (start < 0) {
    start = 0
    end = Math.min(windowSize, totalSpreads)
  } else if (end > totalSpreads) {
    end = totalSpreads
    start = Math.max(0, end - windowSize)
  }

  const result: number[] = []
  for (let i = start; i < end; i++) result.push(i)
  return result
}
