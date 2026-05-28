// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KeyboardShortcutModule } from './KeyboardShortcutModule'

let module: KeyboardShortcutModule

function makeKeyEvent(overrides: Partial<KeyboardEventInit> & { key: string }): KeyboardEvent {
  return new KeyboardEvent('keydown', { bubbles: true, ...overrides })
}

beforeEach(() => {
  module = new KeyboardShortcutModule()
})

describe('KeyboardShortcutModule — registration', () => {
  it('fires handler for registered shortcut (Ctrl)', () => {
    const handler = vi.fn()
    module.register('ctrl+d', handler)
    module.handleKeyEvent(makeKeyEvent({ key: 'd', ctrlKey: true }))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('fires handler for registered shortcut (Cmd/Meta)', () => {
    const handler = vi.fn()
    module.register('meta+d', handler)
    module.handleKeyEvent(makeKeyEvent({ key: 'd', metaKey: true }))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('handles Cmd and Ctrl variants for same logical shortcut', () => {
    const handler = vi.fn()
    module.register('mod+d', handler)
    module.handleKeyEvent(makeKeyEvent({ key: 'd', ctrlKey: true }))
    module.handleKeyEvent(makeKeyEvent({ key: 'd', metaKey: true }))
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('does not fire handler for unregistered shortcut', () => {
    const handler = vi.fn()
    module.register('mod+d', handler)
    module.handleKeyEvent(makeKeyEvent({ key: 's', ctrlKey: true }))
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not fire without modifier when modifier required', () => {
    const handler = vi.fn()
    module.register('mod+d', handler)
    module.handleKeyEvent(makeKeyEvent({ key: 'd' }))
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('KeyboardShortcutModule — unregistration', () => {
  it('unregistering prevents further firing', () => {
    const handler = vi.fn()
    module.register('mod+d', handler)
    module.unregister('mod+d')
    module.handleKeyEvent(makeKeyEvent({ key: 'd', ctrlKey: true }))
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('KeyboardShortcutModule — Escape', () => {
  it('fires Escape handler when Escape is pressed', () => {
    const handler = vi.fn()
    module.register('escape', handler)
    module.handleKeyEvent(makeKeyEvent({ key: 'Escape' }))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('Escape handler not fired for other keys', () => {
    const handler = vi.fn()
    module.register('escape', handler)
    module.handleKeyEvent(makeKeyEvent({ key: 'Enter' }))
    expect(handler).not.toHaveBeenCalled()
  })
})
