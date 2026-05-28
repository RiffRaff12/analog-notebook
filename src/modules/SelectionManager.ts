export class SelectionManager {
  private selectedId: string | null = null
  private editingId: string | null = null

  select(id: string): void {
    this.selectedId = id
    this.editingId = null
  }

  deselect(): void {
    this.selectedId = null
    this.editingId = null
  }

  enterEditMode(id: string): void {
    if (this.selectedId !== id) return
    this.editingId = id
  }

  exitEditMode(): void {
    this.editingId = null
  }

  getSelected(): string | null {
    return this.selectedId
  }

  isSelected(id: string): boolean {
    return this.selectedId === id
  }

  isInEditMode(id: string): boolean {
    return this.editingId === id
  }

  isEditing(): boolean {
    return this.editingId !== null
  }
}
