import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { StorageModule } from './StorageModule'
import { NotebookManager } from './NotebookManager'

let storage: StorageModule
let manager: NotebookManager

beforeEach(async () => {
  storage = new StorageModule(`test-db-${Math.random()}`)
  await storage.open()
  manager = new NotebookManager(storage)
})

describe('NotebookManager — create and list', () => {
  it('creates a notebook and lists it', async () => {
    await manager.createNotebook('Work')
    const list = await manager.listNotebooks()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('Work')
  })

  it('creating a notebook also creates a blank spread', async () => {
    await manager.createNotebook('NB')
    const nbs = await manager.listNotebooks()
    const spreads = await storage.listSpreads(nbs[0].id)
    expect(spreads).toHaveLength(1)
    expect(spreads[0].index).toBe(0)
  })

  it('sets new notebook as active', async () => {
    await manager.createNotebook('First')
    const active = manager.getActiveNotebook()
    expect(active).not.toBeNull()
    expect(active!.name).toBe('First')
  })
})

describe('NotebookManager — rename', () => {
  it('renames a notebook', async () => {
    await manager.createNotebook('Old')
    const list = await manager.listNotebooks()
    await manager.renameNotebook(list[0].id, 'New')
    const updated = await storage.getNotebook(list[0].id)
    expect(updated!.name).toBe('New')
  })
})

describe('NotebookManager — delete', () => {
  it('deletes a notebook', async () => {
    await manager.createNotebook('To Delete')
    const list = await manager.listNotebooks()
    await manager.deleteNotebook(list[0].id)
    const remaining = await manager.listNotebooks()
    expect(remaining).toHaveLength(0)
  })

  it('triggers empty state when last notebook is deleted', async () => {
    await manager.createNotebook('Only One')
    const list = await manager.listNotebooks()
    await manager.deleteNotebook(list[0].id)
    expect(manager.getActiveNotebook()).toBeNull()
    expect(manager.isEmpty()).toBe(true)
  })

  it('switches to another notebook when active is deleted', async () => {
    await manager.createNotebook('A')
    await manager.createNotebook('B')
    const active = manager.getActiveNotebook()!
    await manager.deleteNotebook(active.id)
    expect(manager.getActiveNotebook()).not.toBeNull()
    expect(manager.getActiveNotebook()!.id).not.toBe(active.id)
  })
})

describe('NotebookManager — switch', () => {
  it('switches active notebook', async () => {
    await manager.createNotebook('A')
    await manager.createNotebook('B')
    const list = await manager.listNotebooks()
    const nbA = list.find(n => n.name === 'A')!
    await manager.setActiveNotebook(nbA.id)
    expect(manager.getActiveNotebook()!.id).toBe(nbA.id)
  })

  it('restores lastSpreadIndex on switch', async () => {
    await manager.createNotebook('A')
    const list = await manager.listNotebooks()
    // Manually set lastSpreadIndex for notebook A
    await storage.updateNotebook(list[0].id, { lastSpreadIndex: 3 })
    await manager.setActiveNotebook(list[0].id)
    const active = manager.getActiveNotebook()!
    expect(active.lastSpreadIndex).toBe(3)
  })
})
