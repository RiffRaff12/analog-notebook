import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { StorageModule } from './StorageModule'
import { ImageBoxManager } from './ImageBoxManager'

let storage: StorageModule
let manager: ImageBoxManager
let spreadId: string

beforeEach(async () => {
  storage = new StorageModule(`test-db-${Math.random()}`)
  await storage.open()
  manager = new ImageBoxManager(storage)
  const nb = await storage.createNotebook('NB')
  const spread = await storage.saveSpread({ notebookId: nb.id, index: 0 })
  spreadId = spread.id
})

describe('ImageBoxManager — createImageBox', () => {
  it('sets width to fill from x to page right edge, height preserves aspect ratio', async () => {
    const blob = new Blob(['img'], { type: 'image/png' })
    // paste at x=0.2, natural image is 400×200 (2:1 ratio)
    const ib = await manager.createImageBox(spreadId, 0, 0.2, 0.1, blob, 400, 200)
    // width = 1.0 - 0.2 = 0.8
    expect(ib.width).toBeCloseTo(0.8)
    // height = width / aspectRatio = 0.8 / 2 = 0.4
    expect(ib.height).toBeCloseTo(0.4)
    expect(ib.x).toBeCloseTo(0.2)
    expect(ib.y).toBeCloseTo(0.1)
  })

  it('clamps height so image does not overflow the bottom of the page', async () => {
    const blob = new Blob(['img'], { type: 'image/png' })
    // paste at x=0.0, y=0.8, natural image is 100×400 (1:4 ratio)
    // unclamped height would be 1.0 / (100/400) = 4.0, which overflows
    const ib = await manager.createImageBox(spreadId, 0, 0.0, 0.8, blob, 100, 400)
    // height must be clamped so y + height <= 1.0
    expect(ib.y + ib.height).toBeLessThanOrEqual(1.0)
  })

  it('persists the image box to storage', async () => {
    const blob = new Blob(['img'], { type: 'image/png' })
    const ib = await manager.createImageBox(spreadId, 0, 0.0, 0.0, blob, 200, 100)
    const list = await manager.getImageBoxes(spreadId)
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(ib.id)
  })
})

describe('ImageBoxManager — moveImageBox', () => {
  it('updates the position', async () => {
    const blob = new Blob(['img'], { type: 'image/png' })
    const ib = await manager.createImageBox(spreadId, 0, 0.0, 0.0, blob, 200, 100)
    await manager.moveImageBox(ib.id, 0.3, 0.4)
    const list = await manager.getImageBoxes(spreadId)
    expect(list[0].x).toBeCloseTo(0.3)
    expect(list[0].y).toBeCloseTo(0.4)
  })

  it('clamps x and y to page boundary', async () => {
    const blob = new Blob(['img'], { type: 'image/png' })
    const ib = await manager.createImageBox(spreadId, 0, 0.0, 0.0, blob, 200, 100)
    await manager.moveImageBox(ib.id, -0.5, 1.5)
    const list = await manager.getImageBoxes(spreadId)
    expect(list[0].x).toBeCloseTo(0)
    expect(list[0].y).toBeCloseTo(1)
  })
})

describe('ImageBoxManager — resizeImageBox', () => {
  it('updates the dimensions', async () => {
    const blob = new Blob(['img'], { type: 'image/png' })
    const ib = await manager.createImageBox(spreadId, 0, 0.0, 0.0, blob, 200, 100)
    await manager.resizeImageBox(ib.id, 0.5, 0.3)
    const list = await manager.getImageBoxes(spreadId)
    expect(list[0].width).toBeCloseTo(0.5)
    expect(list[0].height).toBeCloseTo(0.3)
  })

  it('clamps width and height so box stays within page', async () => {
    const blob = new Blob(['img'], { type: 'image/png' })
    const ib = await manager.createImageBox(spreadId, 0, 0.0, 0.0, blob, 200, 100)
    await manager.resizeImageBox(ib.id, 2.0, 3.0)
    const list = await manager.getImageBoxes(spreadId)
    expect(list[0].width).toBeLessThanOrEqual(1.0)
    expect(list[0].height).toBeLessThanOrEqual(1.0)
  })

  it('does not allow zero or negative dimensions', async () => {
    const blob = new Blob(['img'], { type: 'image/png' })
    const ib = await manager.createImageBox(spreadId, 0, 0.0, 0.0, blob, 200, 100)
    await manager.resizeImageBox(ib.id, -1.0, 0)
    const list = await manager.getImageBoxes(spreadId)
    expect(list[0].width).toBeGreaterThan(0)
    expect(list[0].height).toBeGreaterThan(0)
  })
})

describe('ImageBoxManager — deleteImageBox', () => {
  it('removes the image box from storage', async () => {
    const blob = new Blob(['img'], { type: 'image/png' })
    const ib = await manager.createImageBox(spreadId, 0, 0.0, 0.0, blob, 200, 100)
    await manager.deleteImageBox(ib.id)
    const list = await manager.getImageBoxes(spreadId)
    expect(list).toHaveLength(0)
  })
})
