import { useState, useEffect, useRef, useCallback } from 'react'
import {
  StorageModule,
  NotebookManager,
  SpreadManager,
  TextBoxManager,
  SelectionManager,
  KeyboardShortcutModule,
} from '../modules'
import type { Notebook, Spread, TextBox } from '../modules'

export interface NotebookState {
  ready: boolean
  notebooks: Notebook[]
  activeNotebook: Notebook | null
  currentSpread: Spread | null
  spreads: Spread[]
  textBoxes: TextBox[]
  selectedId: string | null
  editingId: string | null
  canGoNext: boolean
  canGoPrev: boolean
  pageCount: number
  isEmpty: boolean
  tbManager: TextBoxManager | null
  navigationDirection: 'forward' | 'backward' | null
  navigationCount: number
}

export interface NotebookActions {
  goToNext: () => Promise<void>
  goToPrev: () => Promise<void>
  goToSpread: (index: number) => Promise<void>
  addSpread: () => Promise<void>
  createTextBox: (pageIndex: 0 | 1, x: number, y: number) => Promise<TextBox | null>
  updateContent: (id: string, content: string) => Promise<void>
  updateFontSize: (id: string, fontSize: 12 | 16 | 20) => Promise<void>
  toggleStrikethrough: (id: string) => Promise<void>
  deleteTextBox: (id: string) => Promise<void>
  moveTextBox: (id: string, x: number, y: number, pageIndex?: 0 | 1) => Promise<void>
  selectBox: (id: string) => void
  deselectBox: () => void
  enterEditMode: (id: string) => void
  exitEditMode: () => void
  createNotebook: (name: string) => Promise<void>
  renameNotebook: (id: string, name: string) => Promise<void>
  deleteNotebook: (id: string) => Promise<void>
  switchNotebook: (id: string) => Promise<void>
}

export function useNotebook(): [NotebookState, NotebookActions] {
  const storageRef = useRef<StorageModule | null>(null)
  const nbManagerRef = useRef<NotebookManager | null>(null)
  const spreadManagerRef = useRef<SpreadManager | null>(null)
  const tbManagerRef = useRef<TextBoxManager | null>(null)
  const selectionRef = useRef<SelectionManager>(new SelectionManager())
  const kbRef = useRef<KeyboardShortcutModule>(new KeyboardShortcutModule())
  const navigatingRef = useRef(false)

  const [state, setState] = useState<NotebookState>({
    ready: false,
    notebooks: [],
    activeNotebook: null,
    currentSpread: null,
    spreads: [],
    textBoxes: [],
    selectedId: null,
    editingId: null,
    canGoNext: false,
    canGoPrev: false,
    pageCount: 0,
    isEmpty: false,
    tbManager: null,
    navigationDirection: null,
    navigationCount: 0,
  })

  const refresh = useCallback(async () => {
    const sm = spreadManagerRef.current
    const nbm = nbManagerRef.current
    const tbm = tbManagerRef.current
    const storage = storageRef.current
    const sel = selectionRef.current
    if (!nbm || !storage) return
    if (!sm || !tbm) {
      const notebooks = await storage.listNotebooks()
      setState(prev => ({ ...prev, ready: true, notebooks, activeNotebook: nbm.getActiveNotebook(), isEmpty: nbm.isEmpty(), tbManager: null }))
      return
    }

    const spread = await sm.getCurrentSpread()
    const textBoxes = spread ? await tbm.getTextBoxes(spread.id) : []
    const notebooks = await storage.listNotebooks()

    setState({
      ready: true,
      notebooks,
      activeNotebook: nbm.getActiveNotebook(),
      currentSpread: spread ?? null,
      spreads: sm.getSpreads(),
      textBoxes,
      selectedId: sel.getSelected(),
      editingId: sel.getSelected() && sel.isInEditMode(sel.getSelected()!) ? sel.getSelected() : null,
      canGoNext: sm.canGoNext(),
      canGoPrev: sm.canGoPrev(),
      pageCount: sm.getPageCount(),
      isEmpty: nbm.isEmpty(),
      tbManager: tbManagerRef.current,
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
        const id = sel.getSelected()
        if (id && !sel.isEditing()) {
          sel.deselect()
          await tbManagerRef.current?.deleteTextBox(id)
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
            if (!sm.canGoNext()) await sm.addSpread()
            await sm.goToNext()
            sel.deselect()
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
        if (!sm.canGoNext()) await sm.addSpread()
        await sm.goToNext()
        selectionRef.current.deselect()
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
        await refresh()
      } finally {
        navigatingRef.current = false
      }
    },
    addSpread: async () => {
      await spreadManagerRef.current?.addSpread()
      await spreadManagerRef.current?.goToNext()
      selectionRef.current.deselect()
      await refresh()
    },
    createTextBox: async (pageIndex, x, y) => {
      const sm = spreadManagerRef.current
      const tbm = tbManagerRef.current
      if (!sm || !tbm) return null
      const spread = await sm.getCurrentSpread()
      if (!spread) return null
      const tb = await tbm.createTextBox(spread.id, pageIndex, x, y)
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
      refresh()
    },
    deselectBox: () => {
      selectionRef.current.deselect()
      refresh()
    },
    enterEditMode: (id) => {
      selectionRef.current.select(id)
      selectionRef.current.enterEditMode(id)
      refresh()
    },
    exitEditMode: () => {
      selectionRef.current.exitEditMode()
      refresh()
    },
    createNotebook: async (name) => {
      const nbm = nbManagerRef.current!
      await nbm.createNotebook(name)
      const active = nbm.getActiveNotebook()!
      await initSpreadManager(active.id)
      selectionRef.current.deselect()
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
      await refresh()
    },
    switchNotebook: async (id) => {
      await nbManagerRef.current?.setActiveNotebook(id)
      await initSpreadManager(id)
      selectionRef.current.deselect()
      await refresh()
    },
  }

  return [state, actions]
}
