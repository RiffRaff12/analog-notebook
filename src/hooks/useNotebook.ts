import { useState, useEffect, useRef, useCallback } from 'react'
import {
  StorageModule,
  NotebookManager,
  SpreadManager,
  TextBoxManager,
  ImageBoxManager,
  SelectionManager,
  KeyboardShortcutModule,
} from '../modules'
import type { Notebook, Spread, TextBox, ImageBox } from '../modules'

export interface NotebookState {
  ready: boolean
  notebooks: Notebook[]
  activeNotebook: Notebook | null
  currentSpread: Spread | null
  spreads: Spread[]
  textBoxes: TextBox[]
  imageBoxes: ImageBox[]
  selectedId: string | null
  selectedImageId: string | null
  editingId: string | null
  canGoNext: boolean
  canGoPrev: boolean
  pageCount: number
  isEmpty: boolean
  tbManager: TextBoxManager | null
  ibManager: ImageBoxManager | null
  navigationDirection: 'forward' | 'backward' | null
  navigationCount: number
}

export interface NotebookActions {
  goToNext: () => Promise<void>
  goToPrev: () => Promise<void>
  goToSpread: (index: number) => Promise<void>
  addSpread: () => Promise<void>
  deleteSpread: (id: string) => Promise<void>
  createTextBox: (pageIndex: 0 | 1, x: number, y: number) => Promise<TextBox | null>
  updateContent: (id: string, content: string) => Promise<void>
  updateFontSize: (id: string, fontSize: 12 | 16 | 20) => Promise<void>
  toggleStrikethrough: (id: string) => Promise<void>
  deleteTextBox: (id: string) => Promise<void>
  moveTextBox: (id: string, x: number, y: number, pageIndex?: 0 | 1) => Promise<void>
  selectBox: (id: string) => void
  deselectBox: () => void
  enterEditMode: (id: string) => Promise<void>
  exitEditMode: () => void
  blurTextBox: (id: string, content: string) => Promise<void>
  createNotebook: (name: string) => Promise<void>
  renameNotebook: (id: string, name: string) => Promise<void>
  deleteNotebook: (id: string) => Promise<void>
  switchNotebook: (id: string) => Promise<void>
  pasteImageBox: (pageIndex: 0 | 1, x: number, y: number, blob: Blob, naturalWidth: number, naturalHeight: number) => Promise<void>
  deleteImageBox: (id: string) => Promise<void>
  moveImageBox: (id: string, x: number, y: number, pageIndex?: 0 | 1) => Promise<void>
  resizeImageBox: (id: string, width: number, height: number) => Promise<void>
  selectImageBox: (id: string) => void
  deselectImageBox: () => void
}

export function useNotebook(): [NotebookState, NotebookActions] {
  const storageRef = useRef<StorageModule | null>(null)
  const nbManagerRef = useRef<NotebookManager | null>(null)
  const spreadManagerRef = useRef<SpreadManager | null>(null)
  const tbManagerRef = useRef<TextBoxManager | null>(null)
  const ibManagerRef = useRef<ImageBoxManager | null>(null)
  const selectionRef = useRef<SelectionManager>(new SelectionManager())
  const kbRef = useRef<KeyboardShortcutModule>(new KeyboardShortcutModule())
  const navigatingRef = useRef(false)
  const lastSpreadCreatedRef = useRef(0)
  const selectedImageIdRef = useRef<string | null>(null)

  const [state, setState] = useState<NotebookState>({
    ready: false,
    notebooks: [],
    activeNotebook: null,
    currentSpread: null,
    spreads: [],
    textBoxes: [],
    imageBoxes: [],
    selectedId: null,
    selectedImageId: null,
    editingId: null,
    canGoNext: false,
    canGoPrev: false,
    pageCount: 0,
    isEmpty: false,
    tbManager: null,
    ibManager: null,
    navigationDirection: null,
    navigationCount: 0,
  })

  const refresh = useCallback(async () => {
    const sm = spreadManagerRef.current
    const nbm = nbManagerRef.current
    const tbm = tbManagerRef.current
    const ibm = ibManagerRef.current
    const storage = storageRef.current
    const sel = selectionRef.current
    if (!nbm || !storage) return
    if (!sm || !tbm) {
      const notebooks = await storage.listNotebooks()
      setState(prev => ({ ...prev, ready: true, notebooks, activeNotebook: nbm.getActiveNotebook(), isEmpty: nbm.isEmpty(), tbManager: null, ibManager: null }))
      return
    }

    const spread = await sm.getCurrentSpread()
    const textBoxes = spread ? await tbm.getTextBoxes(spread.id) : []
    const imageBoxes = spread && ibm ? await ibm.getImageBoxes(spread.id) : []
    const notebooks = await storage.listNotebooks()

    setState({
      ready: true,
      notebooks,
      activeNotebook: nbm.getActiveNotebook(),
      currentSpread: spread ?? null,
      spreads: sm.getSpreads(),
      textBoxes,
      imageBoxes,
      selectedId: sel.getSelected(),
      selectedImageId: selectedImageIdRef.current,
      editingId: sel.getSelected() && sel.isInEditMode(sel.getSelected()!) ? sel.getSelected() : null,
      canGoNext: sm.canGoNext(),
      canGoPrev: sm.canGoPrev(),
      pageCount: sm.getPageCount(),
      isEmpty: nbm.isEmpty(),
      tbManager: tbManagerRef.current,
      ibManager: ibManagerRef.current,
      navigationDirection: sm.navigationDirection,
      navigationCount: sm.navigationCount,
    })
  }, [])

  const initSpreadManager = useCallback(async (notebookId: string) => {
    const storage = storageRef.current!
    const sm = new SpreadManager(storage, notebookId)
    await sm.init()
    spreadManagerRef.current = sm
    tbManagerRef.current = new TextBoxManager(storage)
    ibManagerRef.current = new ImageBoxManager(storage)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      const storage = new StorageModule()
      await storage.open()
      storageRef.current = storage

      const nbm = new NotebookManager(storage)
      nbManagerRef.current = nbm

      const notebooks = await storage.listNotebooks()
      if (notebooks.length === 0) {
        await nbm.createNotebook('Notebook 1')
      } else {
        await nbm.setActiveNotebook(notebooks[0].id)
      }

      const active = nbm.getActiveNotebook()!
      await initSpreadManager(active.id)

      const kb = kbRef.current
      const sel = selectionRef.current
      kb.register('escape', () => {
        sel.deselect()
        selectedImageIdRef.current = null
        refresh()
      })
      kb.register('mod+d', async () => {
        const id = sel.getSelected()
        if (id) {
          await tbManagerRef.current?.toggleStrikethrough(id)
          await refresh()
        }
      })
      const deleteSelected = async () => {
        const textId = sel.getSelected()
        const imageId = selectedImageIdRef.current
        if (imageId) {
          selectedImageIdRef.current = null
          await ibManagerRef.current?.deleteImageBox(imageId)
          await refresh()
        } else if (textId && !sel.isEditing()) {
          sel.deselect()
          await tbManagerRef.current?.deleteTextBox(textId)
          await refresh()
        }
      }
      kb.register('delete', deleteSelected)
      kb.register('backspace', deleteSelected)
      kb.register('arrowleft', async () => {
        if (!sel.isEditing() && !navigatingRef.current) {
          navigatingRef.current = true
          try {
            await spreadManagerRef.current?.goToPrev()
            sel.deselect()
            selectedImageIdRef.current = null
            await refresh()
          } finally {
            navigatingRef.current = false
          }
        }
      })
      kb.register('arrowright', async () => {
        if (!sel.isEditing() && !navigatingRef.current) {
          navigatingRef.current = true
          try {
            const sm = spreadManagerRef.current
            if (!sm) return
            if (!sm.canGoNext()) {
              if (Date.now() - lastSpreadCreatedRef.current < 500) return
              await sm.addSpread()
              lastSpreadCreatedRef.current = Date.now()
            }
            await sm.goToNext()
            sel.deselect()
            selectedImageIdRef.current = null
            await refresh()
          } finally {
            navigatingRef.current = false
          }
        }
      })

      const handleKey = (e: KeyboardEvent) => kb.handleKeyEvent(e)
      window.addEventListener('keydown', handleKey)

      if (!cancelled) await refresh()

      return () => {
        window.removeEventListener('keydown', handleKey)
      }
    }

    init()
    return () => { cancelled = true }
  }, [refresh, initSpreadManager])

  const actions: NotebookActions = {
    goToNext: async () => {
      if (navigatingRef.current) return
      navigatingRef.current = true
      try {
        const sm = spreadManagerRef.current
        if (!sm) return
        if (!sm.canGoNext()) {
          if (Date.now() - lastSpreadCreatedRef.current < 500) return
          await sm.addSpread()
          lastSpreadCreatedRef.current = Date.now()
        }
        await sm.goToNext()
        selectionRef.current.deselect()
        selectedImageIdRef.current = null
        await refresh()
      } finally {
        navigatingRef.current = false
      }
    },
    goToPrev: async () => {
      if (navigatingRef.current) return
      navigatingRef.current = true
      try {
        await spreadManagerRef.current?.goToPrev()
        selectionRef.current.deselect()
        selectedImageIdRef.current = null
        await refresh()
      } finally {
        navigatingRef.current = false
      }
    },
    goToSpread: async (index) => {
      if (navigatingRef.current) return
      navigatingRef.current = true
      try {
        await spreadManagerRef.current?.goToSpread(index)
        selectionRef.current.deselect()
        selectedImageIdRef.current = null
        await refresh()
      } finally {
        navigatingRef.current = false
      }
    },
    addSpread: async () => {
      await spreadManagerRef.current?.addSpread()
      await spreadManagerRef.current?.goToNext()
      selectionRef.current.deselect()
      selectedImageIdRef.current = null
      await refresh()
    },
    deleteSpread: async (id) => {
      await spreadManagerRef.current?.deleteSpread(id)
      selectionRef.current.deselect()
      selectedImageIdRef.current = null
      await refresh()
    },
    createTextBox: async (pageIndex, x, y) => {
      const sm = spreadManagerRef.current
      const tbm = tbManagerRef.current
      if (!sm || !tbm) return null
      const spread = await sm.getCurrentSpread()
      if (!spread) return null
      const tb = await tbm.createTextBox(spread.id, pageIndex, x, y)
      selectedImageIdRef.current = null
      await refresh()
      return tb
    },
    updateContent: async (id, content) => {
      await tbManagerRef.current?.updateContent(id, content)
      await refresh()
    },
    updateFontSize: async (id, fontSize) => {
      await tbManagerRef.current?.updateFontSize(id, fontSize)
      await refresh()
    },
    toggleStrikethrough: async (id) => {
      await tbManagerRef.current?.toggleStrikethrough(id)
      await refresh()
    },
    deleteTextBox: async (id) => {
      selectionRef.current.deselect()
      await tbManagerRef.current?.deleteTextBox(id)
      await refresh()
    },
    moveTextBox: async (id, x, y, pageIndex) => {
      await tbManagerRef.current?.moveTextBox(id, x, y, pageIndex)
      await refresh()
    },
    selectBox: (id) => {
      selectionRef.current.select(id)
      selectedImageIdRef.current = null
      refresh()
    },
    deselectBox: () => {
      selectionRef.current.deselect()
      refresh()
    },
    enterEditMode: async (id) => {
      const sel = selectionRef.current
      // When switching from an editing box without blur (keyboard-keep-open path),
      // the onBlur cleanup won't run — delete the old box here if it's empty.
      if (sel.isEditing()) {
        const prevId = sel.getSelected()
        if (prevId && prevId !== id) {
          const prevBox = await storageRef.current?.getTextBox(prevId)
          if (prevBox && !prevBox.content.trim()) {
            sel.deselect()
            await tbManagerRef.current?.deleteTextBox(prevId)
          }
        }
      }
      sel.select(id)
      sel.enterEditMode(id)
      selectedImageIdRef.current = null
      await refresh()
    },
    exitEditMode: () => {
      selectionRef.current.exitEditMode()
      refresh()
    },
    blurTextBox: async (id, content) => {
      const sel = selectionRef.current
      // If another box already took over edit mode (e.g. programmatic switch),
      // this blur is stale — don't touch the new box's state.
      if (!sel.isInEditMode(id)) return
      if (!content.trim()) {
        sel.deselect()
        await tbManagerRef.current?.deleteTextBox(id)
        await refresh()
      } else {
        sel.exitEditMode()
        refresh()
      }
    },
    createNotebook: async (name) => {
      const nbm = nbManagerRef.current!
      await nbm.createNotebook(name)
      const active = nbm.getActiveNotebook()!
      await initSpreadManager(active.id)
      selectionRef.current.deselect()
      selectedImageIdRef.current = null
      await refresh()
    },
    renameNotebook: async (id, name) => {
      await nbManagerRef.current?.renameNotebook(id, name)
      await refresh()
    },
    deleteNotebook: async (id) => {
      const nbm = nbManagerRef.current!
      await nbm.deleteNotebook(id)
      const active = nbm.getActiveNotebook()
      if (active) {
        await initSpreadManager(active.id)
      } else {
        spreadManagerRef.current = null
      }
      selectionRef.current.deselect()
      selectedImageIdRef.current = null
      await refresh()
    },
    switchNotebook: async (id) => {
      await nbManagerRef.current?.setActiveNotebook(id)
      await initSpreadManager(id)
      selectionRef.current.deselect()
      selectedImageIdRef.current = null
      await refresh()
    },
    pasteImageBox: async (pageIndex, x, y, blob, naturalWidth, naturalHeight) => {
      const sm = spreadManagerRef.current
      const ibm = ibManagerRef.current
      if (!sm || !ibm) return
      const spread = await sm.getCurrentSpread()
      if (!spread) return
      await ibm.createImageBox(spread.id, pageIndex, x, y, blob, naturalWidth, naturalHeight)
      await refresh()
    },
    deleteImageBox: async (id) => {
      selectedImageIdRef.current = null
      await ibManagerRef.current?.deleteImageBox(id)
      await refresh()
    },
    moveImageBox: async (id, x, y, pageIndex) => {
      await ibManagerRef.current?.moveImageBox(id, x, y, pageIndex)
      await refresh()
    },
    resizeImageBox: async (id, width, height) => {
      await ibManagerRef.current?.resizeImageBox(id, width, height)
      await refresh()
    },
    selectImageBox: (id) => {
      selectedImageIdRef.current = id
      selectionRef.current.deselect()
      refresh()
    },
    deselectImageBox: () => {
      selectedImageIdRef.current = null
      refresh()
    },
  }

  return [state, actions]
}
