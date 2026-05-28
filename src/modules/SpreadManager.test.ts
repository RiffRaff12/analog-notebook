import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { StorageModule } from './StorageModule'
import { SpreadManager } from './SpreadManager'

let storage: StorageModule
let manager: SpreadManager
let notebookId: string

beforeEach(async () => {
  storage = new StorageModule(`test-db-${Math.random()}`)
  await storage.open()
  const nb = await storage.createNotebook('Test NB')
  notebookId = nb.id
  await storage.saveSpread({ notebookId, index: 0 })
  manager = new SpreadManager(storage, notebookId)
  await manager.init()
})

describe('SpreadManager — navigation', () => {
  it('starts at spread index 0', async () => {
    const spread = await manager.getCurrentSpread()
    expect(spread.index).toBe(0)
  })

  it('cannot go to prev on first spread', async () => {
    expect(manager.canGoPrev()).toBe(false)
  })

  it('cannot go to next on last spread (one spread)', async () => {
    expect(manager.canGoNext()).toBe(false)
  })

  it('adds a spread and navigates to it', async () => {
    await manager.addSpread()
    expect(manager.canGoNext()).toBe(true)
    await manager.goToNext()
    const spread = await manager.getCurrentSpread()
    expect(spread.index).toBe(1)
  })

  it('cannot go past the last spread', async () => {
    await manager.addSpread()
    await manager.goToNext()
    expect(manager.canGoNext()).toBe(false)
    await manager.goToNext() // should be a no-op
    const spread = await manager.getCurrentSpread()
    expect(spread.index).toBe(1)
  })

  it('can go prev after navigating forward', async () => {
    await manager.addSpread()
    await manager.goToNext()
    expect(manager.canGoPrev()).toBe(true)
    await manager.goToPrev()
    const spread = await manager.getCurrentSpread()
    expect(spread.index).toBe(0)
  })

  it('cannot go before first spread', async () => {
    await manager.goToPrev() // should be no-op
    const spread = await manager.getCurrentSpread()
    expect(spread.index).toBe(0)
  })

  it('getPageCount returns number of spreads', async () => {
    expect(manager.getPageCount()).toBe(1)
    await manager.addSpread()
    expect(manager.getPageCount()).toBe(2)
    await manager.addSpread()
    expect(manager.getPageCount()).toBe(3)
  })

  it('adding spread increments count', async () => {
    const before = manager.getPageCount()
    await manager.addSpread()
    expect(manager.getPageCount()).toBe(before + 1)
  })

  it('persists lastSpreadIndex on navigation', async () => {
    await manager.addSpread()
    await manager.goToNext()
    const nb = await storage.getNotebook(notebookId)
    expect(nb!.lastSpreadIndex).toBe(1)
  })

  it('canGoNext returns false at boundaries', async () => {
    await manager.addSpread()
    await manager.goToNext()
    expect(manager.canGoNext()).toBe(false)
    expect(manager.canGoPrev()).toBe(true)
  })

  it('canGoPrev returns false at boundaries', async () => {
    expect(manager.canGoPrev()).toBe(false)
    expect(manager.canGoNext()).toBe(false)
  })
})

describe('SpreadManager — navigationDirection', () => {
  it('is null initially', () => {
    expect(manager.navigationDirection).toBeNull()
  })

  it('is forward after goToNext', async () => {
    await manager.addSpread()
    await manager.goToNext()
    expect(manager.navigationDirection).toBe('forward')
  })

  it('is backward after goToPrev', async () => {
    await manager.addSpread()
    await manager.goToNext()
    await manager.goToPrev()
    expect(manager.navigationDirection).toBe('backward')
  })

  it('updates correctly on repeated navigation', async () => {
    await manager.addSpread()
    await manager.goToNext()
    expect(manager.navigationDirection).toBe('forward')
    await manager.goToPrev()
    expect(manager.navigationDirection).toBe('backward')
  })

  it('stays null when goToNext is a no-op (already at end)', async () => {
    await manager.goToNext() // no-op, only one spread
    expect(manager.navigationDirection).toBeNull()
  })
})
