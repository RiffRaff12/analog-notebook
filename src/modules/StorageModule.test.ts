import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { StorageModule } from './StorageModule'

let storage: StorageModule

beforeEach(async () => {
  // Each test gets a fresh DB by using a unique name
  storage = new StorageModule(`test-db-${Math.random()}`)
  await storage.open()
})

describe('StorageModule — Notebook CRUD', () => {
  it('creates and retrieves a notebook', async () => {
    const nb = await storage.createNotebook('My Notebook')
    const fetched = await storage.getNotebook(nb.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.name).toBe('My Notebook')
  })

  it('lists notebooks', async () => {
    await storage.createNotebook('A')
    await storage.createNotebook('B')
    const list = await storage.listNotebooks()
    expect(list).toHaveLength(2)
    expect(list.map(n => n.name)).toContain('A')
    expect(list.map(n => n.name)).toContain('B')
  })

  it('updates a notebook name', async () => {
    const nb = await storage.createNotebook('Old Name')
    await storage.updateNotebook(nb.id, { name: 'New Name' })
    const fetched = await storage.getNotebook(nb.id)
    expect(fetched!.name).toBe('New Name')
  })

  it('deletes a notebook', async () => {
    const nb = await storage.createNotebook('To Delete')
    await storage.deleteNotebook(nb.id)
    const fetched = await storage.getNotebook(nb.id)
    expect(fetched).toBeUndefined()
  })

  it('assigns a unique id to each notebook', async () => {
    const a = await storage.createNotebook('A')
    const b = await storage.createNotebook('B')
    expect(a.id).not.toBe(b.id)
  })
})

describe('StorageModule — Spread CRUD', () => {
  it('saves and retrieves a spread', async () => {
    const nb = await storage.createNotebook('NB')
    const spread = await storage.saveSpread({ notebookId: nb.id, index: 0 })
    const fetched = await storage.getSpread(spread.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.notebookId).toBe(nb.id)
    expect(fetched!.index).toBe(0)
  })

  it('lists spreads for a notebook', async () => {
    const nb = await storage.createNotebook('NB')
    await storage.saveSpread({ notebookId: nb.id, index: 0 })
    await storage.saveSpread({ notebookId: nb.id, index: 1 })
    const list = await storage.listSpreads(nb.id)
    expect(list).toHaveLength(2)
    expect(list.map(s => s.index).sort()).toEqual([0, 1])
  })

  it('does not mix spreads across notebooks', async () => {
    const nb1 = await storage.createNotebook('NB1')
    const nb2 = await storage.createNotebook('NB2')
    await storage.saveSpread({ notebookId: nb1.id, index: 0 })
    const list = await storage.listSpreads(nb2.id)
    expect(list).toHaveLength(0)
  })
})

describe('StorageModule — TextBox CRUD', () => {
  it('creates and retrieves a text box', async () => {
    const nb = await storage.createNotebook('NB')
    const spread = await storage.saveSpread({ notebookId: nb.id, index: 0 })
    const tb = await storage.createTextBox({
      spreadId: spread.id,
      pageIndex: 0,
      x: 0.1,
      y: 0.2,
      content: 'Hello',
      fontSize: 16,
      isStruck: false,
    })
    const fetched = await storage.getTextBox(tb.id)
    expect(fetched!.content).toBe('Hello')
    expect(fetched!.x).toBeCloseTo(0.1)
    expect(fetched!.y).toBeCloseTo(0.2)
    expect(fetched!.pageIndex).toBe(0)
  })

  it('updates text box content', async () => {
    const nb = await storage.createNotebook('NB')
    const spread = await storage.saveSpread({ notebookId: nb.id, index: 0 })
    const tb = await storage.createTextBox({
      spreadId: spread.id,
      pageIndex: 0,
      x: 0.5,
      y: 0.5,
      content: 'Old',
      fontSize: 16,
      isStruck: false,
    })
    await storage.updateTextBox(tb.id, { content: 'New', isStruck: true })
    const fetched = await storage.getTextBox(tb.id)
    expect(fetched!.content).toBe('New')
    expect(fetched!.isStruck).toBe(true)
  })

  it('deletes a text box', async () => {
    const nb = await storage.createNotebook('NB')
    const spread = await storage.saveSpread({ notebookId: nb.id, index: 0 })
    const tb = await storage.createTextBox({
      spreadId: spread.id,
      pageIndex: 0,
      x: 0.3,
      y: 0.3,
      content: 'Delete me',
      fontSize: 16,
      isStruck: false,
    })
    await storage.deleteTextBox(tb.id)
    const fetched = await storage.getTextBox(tb.id)
    expect(fetched).toBeUndefined()
  })

  it('lists text boxes for a spread', async () => {
    const nb = await storage.createNotebook('NB')
    const spread = await storage.saveSpread({ notebookId: nb.id, index: 0 })
    await storage.createTextBox({ spreadId: spread.id, pageIndex: 0, x: 0.1, y: 0.1, content: 'A', fontSize: 16, isStruck: false })
    await storage.createTextBox({ spreadId: spread.id, pageIndex: 1, x: 0.5, y: 0.5, content: 'B', fontSize: 16, isStruck: false })
    const list = await storage.getTextBoxes(spread.id)
    expect(list).toHaveLength(2)
    expect(list.map(t => t.content).sort()).toEqual(['A', 'B'])
  })

  it('does not mix text boxes across spreads', async () => {
    const nb = await storage.createNotebook('NB')
    const s1 = await storage.saveSpread({ notebookId: nb.id, index: 0 })
    const s2 = await storage.saveSpread({ notebookId: nb.id, index: 1 })
    await storage.createTextBox({ spreadId: s1.id, pageIndex: 0, x: 0.5, y: 0.5, content: 'Only in S1', fontSize: 16, isStruck: false })
    const list = await storage.getTextBoxes(s2.id)
    expect(list).toHaveLength(0)
  })
})
