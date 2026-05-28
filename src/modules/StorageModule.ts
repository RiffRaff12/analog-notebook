import { openDB, type IDBPDatabase } from 'idb'

export interface Notebook {
  id: string
  name: string
  lastSpreadIndex: number
  createdAt: number
  updatedAt: number
}

export interface Spread {
  id: string
  notebookId: string
  index: number
  createdAt: number
}

export interface TextBox {
  id: string
  spreadId: string
  pageIndex: 0 | 1
  x: number
  y: number
  content: string
  fontSize: 12 | 16 | 20
  isStruck: boolean
  createdAt: number
  updatedAt: number
}

export interface ImageBox {
  id: string
  spreadId: string
  pageIndex: 0 | 1
  x: number
  y: number
  width: number
  height: number
  imageData: Blob
  createdAt: number
  updatedAt: number
}

type CreateTextBoxInput = Omit<TextBox, 'id' | 'createdAt' | 'updatedAt'>
type SaveSpreadInput = Omit<Spread, 'id' | 'createdAt'>
export type CreateImageBoxInput = Omit<ImageBox, 'id' | 'createdAt' | 'updatedAt'>

const DB_VERSION = 2

export class StorageModule {
  private db: IDBPDatabase | null = null
  private dbName: string

  constructor(dbName = 'analog-notebook') {
    this.dbName = dbName
  }

  async open(): Promise<void> {
    this.db = await openDB(this.dbName, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('notebooks')) {
          db.createObjectStore('notebooks', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('spreads')) {
          const spreadStore = db.createObjectStore('spreads', { keyPath: 'id' })
          spreadStore.createIndex('by-notebook', 'notebookId')
        }
        if (!db.objectStoreNames.contains('textBoxes')) {
          const tbStore = db.createObjectStore('textBoxes', { keyPath: 'id' })
          tbStore.createIndex('by-spread', 'spreadId')
        }
        if (!db.objectStoreNames.contains('imageBoxes')) {
          const ibStore = db.createObjectStore('imageBoxes', { keyPath: 'id' })
          ibStore.createIndex('by-spread', 'spreadId')
        }
      },
    })
  }

  private get store(): IDBPDatabase {
    if (!this.db) throw new Error('StorageModule not opened')
    return this.db
  }

  async createNotebook(name: string): Promise<Notebook> {
    const nb: Notebook = {
      id: crypto.randomUUID(),
      name,
      lastSpreadIndex: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await this.store.put('notebooks', nb)
    return nb
  }

  async getNotebook(id: string): Promise<Notebook | undefined> {
    return this.store.get('notebooks', id)
  }

  async listNotebooks(): Promise<Notebook[]> {
    return this.store.getAll('notebooks')
  }

  async updateNotebook(id: string, patch: Partial<Omit<Notebook, 'id' | 'createdAt'>>): Promise<void> {
    const existing = await this.getNotebook(id)
    if (!existing) return
    await this.store.put('notebooks', { ...existing, ...patch, updatedAt: Date.now() })
  }

  async deleteNotebook(id: string): Promise<void> {
    await this.store.delete('notebooks', id)
  }

  async saveSpread(input: SaveSpreadInput): Promise<Spread> {
    const spread: Spread = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: Date.now(),
    }
    await this.store.put('spreads', spread)
    return spread
  }

  async getSpread(id: string): Promise<Spread | undefined> {
    return this.store.get('spreads', id)
  }

  async listSpreads(notebookId: string): Promise<Spread[]> {
    return this.store.getAllFromIndex('spreads', 'by-notebook', notebookId)
  }

  async createTextBox(input: CreateTextBoxInput): Promise<TextBox> {
    const tb: TextBox = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await this.store.put('textBoxes', tb)
    return tb
  }

  async getTextBox(id: string): Promise<TextBox | undefined> {
    return this.store.get('textBoxes', id)
  }

  async updateTextBox(id: string, patch: Partial<Omit<TextBox, 'id' | 'spreadId' | 'createdAt'>>): Promise<void> {
    const existing = await this.getTextBox(id)
    if (!existing) return
    await this.store.put('textBoxes', { ...existing, ...patch, updatedAt: Date.now() })
  }

  async deleteTextBox(id: string): Promise<void> {
    await this.store.delete('textBoxes', id)
  }

  async getTextBoxes(spreadId: string): Promise<TextBox[]> {
    return this.store.getAllFromIndex('textBoxes', 'by-spread', spreadId)
  }

  async createImageBox(input: CreateImageBoxInput): Promise<ImageBox> {
    const ib: ImageBox = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await this.store.put('imageBoxes', ib)
    return ib
  }

  async getImageBox(id: string): Promise<ImageBox | undefined> {
    return this.store.get('imageBoxes', id)
  }

  async updateImageBox(id: string, patch: Partial<Omit<ImageBox, 'id' | 'spreadId' | 'createdAt'>>): Promise<void> {
    const existing = await this.getImageBox(id)
    if (!existing) return
    await this.store.put('imageBoxes', { ...existing, ...patch, updatedAt: Date.now() })
  }

  async deleteImageBox(id: string): Promise<void> {
    await this.store.delete('imageBoxes', id)
  }

  async getImageBoxes(spreadId: string): Promise<ImageBox[]> {
    return this.store.getAllFromIndex('imageBoxes', 'by-spread', spreadId)
  }
}
