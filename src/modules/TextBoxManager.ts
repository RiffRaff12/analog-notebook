import type { StorageModule, TextBox } from './StorageModule'

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export class TextBoxManager {
  private storage: StorageModule
  constructor(storage: StorageModule) {
    this.storage = storage
  }

  async createTextBox(
    spreadId: string,
    pageIndex: 0 | 1,
    x: number,
    y: number,
  ): Promise<TextBox> {
    return this.storage.createTextBox({
      spreadId,
      pageIndex,
      x: clamp(x),
      y: clamp(y),
      content: '',
      fontSize: 16,
      isStruck: false,
    })
  }

  async updateContent(id: string, content: string): Promise<void> {
    await this.storage.updateTextBox(id, { content })
  }

  async updateFontSize(id: string, fontSize: 12 | 16 | 20): Promise<void> {
    await this.storage.updateTextBox(id, { fontSize })
  }

  async toggleStrikethrough(id: string): Promise<void> {
    const tb = await this.storage.getTextBox(id)
    if (!tb) return
    await this.storage.updateTextBox(id, { isStruck: !tb.isStruck })
  }

  async moveTextBox(id: string, x: number, y: number, pageIndex?: 0 | 1): Promise<void> {
    const patch: Parameters<typeof this.storage.updateTextBox>[1] = { x: clamp(x), y: clamp(y) }
    if (pageIndex !== undefined) patch.pageIndex = pageIndex
    await this.storage.updateTextBox(id, patch)
  }

  async getTextBoxes(spreadId: string): Promise<TextBox[]> {
    return this.storage.getTextBoxes(spreadId)
  }

  async deleteTextBox(id: string): Promise<void> {
    await this.storage.deleteTextBox(id)
  }
}
