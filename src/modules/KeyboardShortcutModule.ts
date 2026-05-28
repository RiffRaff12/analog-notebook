type Handler = () => void

function normalizeShortcut(shortcut: string): string {
  return shortcut.toLowerCase().trim()
}

function matchesEvent(shortcut: string, e: KeyboardEvent): boolean {
  const key = e.key.toLowerCase()
  const parts = shortcut.split('+')
  const modPart = parts.length > 1 ? parts[0] : null
  const keyPart = parts[parts.length - 1]

  if (key !== keyPart && key !== keyPart.toLowerCase()) return false

  if (modPart === 'mod') {
    return e.ctrlKey || e.metaKey
  }
  if (modPart === 'ctrl') return e.ctrlKey
  if (modPart === 'meta') return e.metaKey
  if (modPart === null) return !e.ctrlKey && !e.metaKey && !e.altKey

  return false
}

export class KeyboardShortcutModule {
  private handlers = new Map<string, Handler>()

  register(shortcut: string, handler: Handler): void {
    this.handlers.set(normalizeShortcut(shortcut), handler)
  }

  unregister(shortcut: string): void {
    this.handlers.delete(normalizeShortcut(shortcut))
  }

  handleKeyEvent(e: KeyboardEvent): void {
    if (e.repeat) return
    for (const [shortcut, handler] of this.handlers) {
      if (matchesEvent(shortcut, e)) {
        handler()
      }
    }
  }
}
