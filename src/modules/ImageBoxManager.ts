import type { StorageModule, ImageBox } from './StorageModule'

const MIN_SIZE = 0.02

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v))
}

export class ImageBoxManager {
  private storage: StorageModule

  constructor(storage: StorageModule) {
    this.storage = storage
  }

  async createImageBox(
    spreadId: string,
    pageIndex: 0 | 1,
    x: number,
    y: number,
    imageData: Blob,
    naturalWidth: number,
    naturalHeight: number,
  ): Promise<ImageBox> {
    const cx = clamp(x)
    const cy = clamp(y)
    const aspectRatio = naturalWidth / naturalHeight

    let width = 1.0 - cx
    let height = width / aspectRatio

    // Scale down if the image overflows the bottom
    if (cy + height > 1.0) {
      height = 1.0 - cy
      width = height * aspectRatio
      // Ensure width still fits within page
      if (cx + width > 1.0) {
        width = 1.0 - cx
        height = width / aspectRatio
      }
    }

    return this.storage.createImageBox({
      spreadId,
      pageIndex,
      x: cx,
      y: cy,
      width: clamp(width, MIN_SIZE, 1.0),
      height: clamp(height, MIN_SIZE, 1.0),
      imageData,
    })
  }

  async moveImageBox(id: string, x: number, y: number, pageIndex?: 0 | 1): Promise<void> {
    const patch: { x: number; y: number; pageIndex?: 0 | 1 } = { x: clamp(x), y: clamp(y) }
    if (pageIndex !== undefined) patch.pageIndex = pageIndex
    await this.storage.updateImageBox(id, patch)
  }

  async resizeImageBox(id: string, width: number, height: number): Promise<void> {
    await this.storage.updateImageBox(id, {
      width: clamp(width, MIN_SIZE, 1.0),
      height: clamp(height, MIN_SIZE, 1.0),
    })
  }

  async deleteImageBox(id: string): Promise<void> {
    await this.storage.deleteImageBox(id)
  }

  async getImageBoxes(spreadId: string): Promise<ImageBox[]> {
    return this.storage.getImageBoxes(spreadId)
  }
}
