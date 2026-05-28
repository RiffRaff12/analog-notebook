import { useState, useRef, useEffect } from 'react'
import type { Notebook } from '../modules'
import type { NotebookActions, NotebookState } from '../hooks/useNotebook'

interface Props {
  state: NotebookState
  actions: NotebookActions
}

export function NotebookBar({ state, actions }: Props) {
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const renameRef = useRef<HTMLInputElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (renaming && renameRef.current) renameRef.current.focus()
  }, [renaming])

  useEffect(() => {
    if (!open) return
    const handleMouseDown = (e: MouseEvent) => {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const startRename = () => {
    setRenameValue(state.activeNotebook?.name ?? '')
    setRenaming(true)
    setOpen(false)
  }

  const confirmRename = async () => {
    if (state.activeNotebook && renameValue.trim()) {
      await actions.renameNotebook(state.activeNotebook.id, renameValue.trim())
    }
    setRenaming(false)
  }

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center">
      {renaming ? (
        <input
          ref={renameRef}
          className="text-stone-700 text-sm border-b border-stone-400 bg-transparent outline-none px-1"
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') confirmRename()
            if (e.key === 'Escape') setRenaming(false)
          }}
          onBlur={confirmRename}
        />
      ) : (
        <div ref={groupRef} className="relative flex items-center gap-1">
          <button
            className="text-stone-700 text-sm hover:text-stone-900 transition-colors"
            onClick={startRename}
            title="Click to rename"
          >
            {state.activeNotebook?.name ?? 'Notebook'}
          </button>

          <button
            className="text-stone-400 hover:text-stone-600 transition-colors px-1 text-xs"
            onClick={() => setOpen(o => !o)}
          >
            ▾
          </button>

          {open && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg py-1 min-w-[180px] z-50">
              {state.notebooks.map((nb: Notebook) => (
                <div key={nb.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-stone-50 group">
                  <button
                    className={`text-sm text-left flex-1 ${
                      nb.id === state.activeNotebook?.id ? 'font-semibold text-stone-800' : 'text-stone-600'
                    }`}
                    onClick={async () => {
                      await actions.switchNotebook(nb.id)
                      setOpen(false)
                    }}
                  >
                    {nb.name}
                  </button>
                  {confirmDelete === nb.id ? (
                    <div className="flex gap-1">
                      <button
                        className="text-xs text-red-500 hover:text-red-700"
                        onClick={async () => {
                          await actions.deleteNotebook(nb.id)
                          setConfirmDelete(null)
                          setOpen(false)
                        }}
                      >
                        Delete
                      </button>
                      <button
                        className="text-xs text-stone-400 hover:text-stone-600"
                        onClick={() => setConfirmDelete(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="text-xs text-stone-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setConfirmDelete(nb.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <div className="border-t border-stone-100 mt-1 pt-1">
                <button
                  className="w-full text-left px-3 py-1.5 text-sm text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors"
                  onClick={async () => {
                    await actions.createNotebook(`Notebook ${state.notebooks.length + 1}`)
                    setOpen(false)
                  }}
                >
                  + New notebook
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
