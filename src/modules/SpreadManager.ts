import type { StorageModule, Spread } from './StorageModule'

export class SpreadManager {
  private spreads: Spread[] = []
  private currentIndex = 0
  private storage: StorageModule
  private notebookId: string
  navigationDirection: 'forward' | 'backward' | null = null
  navigationCount = 0

  constructor(storage: StorageModule, notebookId: string) {
    this.storage = storage
    this.notebookId = notebookId
  }

  async init(): Promise<void> {
    this.spreads = await this.storage.listSpreads(this.notebookId)
    this.spreads.sort((a, b) => a.index - b.index)
    const nb = await this.storage.getNotebook(this.notebookId)
    this.currentIndex = nb?.lastSpreadIndex ?? 0
  }

  async getCurrentSpread(): Promise<Spread> {
    return this.spreads[this.currentIndex]
  }

  canGoNext(): boolean {
    return this.currentIndex < this.spreads.length - 1
  }

  canGoPrev(): boolean {
    return this.currentIndex > 0
  }

  async goToNext(): Promise<void> {
    if (!this.canGoNext()) return
    this.currentIndex++
    this.navigationDirection = 'forward'
    this.navigationCount++
    await this.storage.updateNotebook(this.notebookId, { lastSpreadIndex: this.currentIndex })
  }

  async goToPrev(): Promise<void> {
    if (!this.canGoPrev()) return
    this.currentIndex--
    this.navigationDirection = 'backward'
    this.navigationCount++
    await this.storage.updateNotebook(this.notebookId, { lastSpreadIndex: this.currentIndex })
  }

  async addSpread(): Promise<Spread> {
    const nextIndex = this.spreads.length
    const spread = await this.storage.saveSpread({ notebookId: this.notebookId, index: nextIndex })
    this.spreads.push(spread)
    return spread
  }

  async deleteSpread(id: string): Promise<void> {
    const idx = this.spreads.findIndex(s => s.id === id)
    if (idx === -1 || this.spreads.length <= 1) return
    await this.storage.deleteSpread(id)
    this.spreads.splice(idx, 1)
    for (let i = idx; i < this.spreads.length; i++) {
      this.spreads[i].index = i
    }
    if (this.currentIndex >= this.spreads.length) {
      this.currentIndex = this.spreads.length - 1
    }
    await this.storage.updateNotebook(this.notebookId, { lastSpreadIndex: this.currentIndex })
  }

  getPageCount(): number {
    return this.spreads.length
  }

  getSpreads(): Spread[] {
    return [...this.spreads]
  }

  async goToSpread(index: number): Promise<void> {
    if (index < 0 || index >= this.spreads.length) return
    const prev = this.currentIndex
    this.currentIndex = index
    this.navigationDirection = index > prev ? 'forward' : 'backward'
    this.navigationCount++
    await this.storage.updateNotebook(this.notebookId, { lastSpreadIndex: this.currentIndex })
  }
}
