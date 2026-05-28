import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { StorageModule } from './StorageModule'
import { TextBoxManager } from './TextBoxManager'

let storage: StorageModule
let manager: TextBoxManager
let spreadId: string

beforeEach(async () => {
  storage = new StorageModule(`test-db-${Math.random()}`)
  await storage.open()
  const nb = await storage.createNotebook('NB')
  const spread = await storage.saveSpread({ notebookId: nb.id, index: 0 })
  spreadId = spread.id
  manager = new TextBoxManager(storage)
})

describe('TextBoxManager — creation', () => {
  it('creates a text box with position and returns it', async () => {
    const tb = await manager.createTextBox(spreadId, 0, 0.3, 0.4)
    expect(tb.x).toBeCloseTo(0.3)
    expect(tb.y).toBeCloseTo(0.4)
    expect(tb.pageIndex).toBe(0)
    expect(tb.spreadId).toBe(spreadId)
  })

  it('clamps x to 0–1 range', async () => {
    const tb1 = await manager.createTextBox(spreadId, 0, -0.5, 0.5)
    expect(tb1.x).toBe(0)

    const tb2 = await manager.createTextBox(spreadId, 0, 1.5, 0.5)
    expect(tb2.x).toBe(1)
  })

  it('clamps y to 0–1 range', async () => {
    const tb1 = await manager.createTextBox(spreadId, 0, 0.5, -0.1)
    expect(tb1.y).toBe(0)

    const tb2 = await manager.createTextBox(spreadId, 0, 0.5, 1.2)
    expect(tb2.y).toBe(1)
  })

  it('defaults fontSize to 16', async () => {
    const tb = await manager.createTextBox(spreadId, 0, 0.5, 0.5)
    expect(tb.fontSize).toBe(16)
  })

  it('defaults isStruck to false', async () => {
    const tb = await manager.createTextBox(spreadId, 0, 0.5, 0.5)
    expect(tb.isStruck).toBe(false)
  })
})

describe('TextBoxManager — content updates', () => {
  it('updates content and persists it', async () => {
    const tb = await manager.createTextBox(spreadId, 0, 0.5, 0.5)
    await manager.updateContent(tb.id, 'Hello world')
    const fetched = await storage.getTextBox(tb.id)
    expect(fetched!.content).toBe('Hello world')
  })

  it('updates fontSize', async () => {
    const tb = await manager.createTextBox(spreadId, 0, 0.5, 0.5)
    await manager.updateFontSize(tb.id, 20)
    const fetched = await storage.getTextBox(tb.id)
    expect(fetched!.fontSize).toBe(20)
  })
})

describe('TextBoxManager — strikethrough toggle', () => {
  it('toggles strikethrough on', async () => {
    const tb = await manager.createTextBox(spreadId, 0, 0.5, 0.5)
    await manager.toggleStrikethrough(tb.id)
    const fetched = await storage.getTextBox(tb.id)
    expect(fetched!.isStruck).toBe(true)
  })

  it('toggles strikethrough off (idempotency)', async () => {
    const tb = await manager.createTextBox(spreadId, 0, 0.5, 0.5)
    await manager.toggleStrikethrough(tb.id)
    await manager.toggleStrikethrough(tb.id)
    const fetched = await storage.getTextBox(tb.id)
    expect(fetched!.isStruck).toBe(false)
  })
})

describe('TextBoxManager — position', () => {
  it('moves text box and persists position', async () => {
    const tb = await manager.createTextBox(spreadId, 0, 0.1, 0.1)
    await manager.moveTextBox(tb.id, 0.8, 0.9)
    const fetched = await storage.getTextBox(tb.id)
    expect(fetched!.x).toBeCloseTo(0.8)
    expect(fetched!.y).toBeCloseTo(0.9)
  })

  it('clamps moved position within 0–1', async () => {
    const tb = await manager.createTextBox(spreadId, 0, 0.5, 0.5)
    await manager.moveTextBox(tb.id, -0.1, 1.5)
    const fetched = await storage.getTextBox(tb.id)
    expect(fetched!.x).toBe(0)
    expect(fetched!.y).toBe(1)
  })
})

describe('TextBoxManager — retrieval and deletion', () => {
  it('getTextBoxes returns all boxes for a spread', async () => {
    await manager.createTextBox(spreadId, 0, 0.1, 0.1)
    await manager.createTextBox(spreadId, 1, 0.5, 0.5)
    const list = await manager.getTextBoxes(spreadId)
    expect(list).toHaveLength(2)
  })

  it('deleteTextBox removes it from storage', async () => {
    const tb = await manager.createTextBox(spreadId, 0, 0.5, 0.5)
    await manager.deleteTextBox(tb.id)
    const fetched = await storage.getTextBox(tb.id)
    expect(fetched).toBeUndefined()
  })
})
