import { describe, it, expect, beforeEach } from 'vitest'
import { SelectionManager } from './SelectionManager'

let manager: SelectionManager

beforeEach(() => {
  manager = new SelectionManager()
})

describe('SelectionManager — selection state', () => {
  it('starts with nothing selected', () => {
    expect(manager.getSelected()).toBeNull()
  })

  it('selects a text box', () => {
    manager.select('box-1')
    expect(manager.getSelected()).toBe('box-1')
  })

  it('isSelected returns true for selected box', () => {
    manager.select('box-1')
    expect(manager.isSelected('box-1')).toBe(true)
  })

  it('isSelected returns false for non-selected box', () => {
    manager.select('box-1')
    expect(manager.isSelected('box-2')).toBe(false)
  })

  it('deselects the current box', () => {
    manager.select('box-1')
    manager.deselect()
    expect(manager.getSelected()).toBeNull()
  })

  it('selecting a different box replaces selection', () => {
    manager.select('box-1')
    manager.select('box-2')
    expect(manager.getSelected()).toBe('box-2')
    expect(manager.isSelected('box-1')).toBe(false)
  })
})

describe('SelectionManager — edit mode', () => {
  it('is not in edit mode by default', () => {
    expect(manager.isInEditMode('box-1')).toBe(false)
  })

  it('entering edit mode requires selection', () => {
    manager.select('box-1')
    manager.enterEditMode('box-1')
    expect(manager.isInEditMode('box-1')).toBe(true)
  })

  it('isInEditMode returns false for selected but not editing box', () => {
    manager.select('box-1')
    expect(manager.isInEditMode('box-1')).toBe(false)
  })

  it('exits edit mode', () => {
    manager.select('box-1')
    manager.enterEditMode('box-1')
    manager.exitEditMode()
    expect(manager.isInEditMode('box-1')).toBe(false)
    expect(manager.getSelected()).toBe('box-1')
  })

  it('deselecting clears edit mode too', () => {
    manager.select('box-1')
    manager.enterEditMode('box-1')
    manager.deselect()
    expect(manager.isInEditMode('box-1')).toBe(false)
    expect(manager.getSelected()).toBeNull()
  })

  it('isInEditMode returns false for a different box', () => {
    manager.select('box-1')
    manager.enterEditMode('box-1')
    expect(manager.isInEditMode('box-2')).toBe(false)
  })
})

describe('SelectionManager — isEditing()', () => {
  it('returns false when nothing is selected', () => {
    expect(manager.isEditing()).toBe(false)
  })

  it('returns false when selected but not in edit mode', () => {
    manager.select('box-1')
    expect(manager.isEditing()).toBe(false)
  })

  it('returns true when in edit mode', () => {
    manager.select('box-1')
    manager.enterEditMode('box-1')
    expect(manager.isEditing()).toBe(true)
  })

  it('returns false after exitEditMode', () => {
    manager.select('box-1')
    manager.enterEditMode('box-1')
    manager.exitEditMode()
    expect(manager.isEditing()).toBe(false)
  })

  it('returns false after deselect', () => {
    manager.select('box-1')
    manager.enterEditMode('box-1')
    manager.deselect()
    expect(manager.isEditing()).toBe(false)
  })
})
