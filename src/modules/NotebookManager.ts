import type { StorageModule, Notebook } from './StorageModule'

export class NotebookManager {
  private activeNotebook: Notebook | null = null
  private storage: StorageModule

  constructor(storage: StorageModule) {
    this.storage = storage
  }

  async createNotebook(name: string): Promise<Notebook> {
    const nb = await this.storage.createNotebook(name)
    await this.storage.saveSpread({ notebookId: nb.id, index: 0 })
    this.activeNotebook = nb
    return nb
  }

  async renameNotebook(id: string, name: string): Promise<void> {
    await this.storage.updateNotebook(id, { name })
    if (this.activeNotebook?.id === id) {
      this.activeNotebook = { ...this.activeNotebook, name }
    }
  }

  async deleteNotebook(id: string): Promise<void> {
    await this.storage.deleteNotebook(id)
    if (this.activeNotebook?.id === id) {
      const remaining = await this.storage.listNotebooks()
      this.activeNotebook = remaining.length > 0 ? remaining[0] : null
    }
  }

  async setActiveNotebook(id: string): Promise<void> {
    const nb = await this.storage.getNotebook(id)
    this.activeNotebook = nb ?? null
  }

  getActiveNotebook(): Notebook | null {
    return this.activeNotebook
  }

  async listNotebooks(): Promise<Notebook[]> {
    return this.storage.listNotebooks()
  }

  isEmpty(): boolean {
    return this.activeNotebook === null
  }
}
