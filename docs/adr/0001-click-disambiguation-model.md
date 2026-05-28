# ADR 0001: Click Disambiguation Model

**Status:** Accepted (revised 2026-05-28)

## Context

The app has two click targets on a spread: empty space and existing text boxes. Two user intents must be mapped to these targets: creating a new text box and entering an existing one. Without a clear rule, the interaction model is ambiguous and components will implement conflicting assumptions.

## Decision

- **Click on empty space** → create a new text box at that position and immediately enter edit mode
- **Click on an existing text box (any state)** → enter edit mode immediately; no intermediate selection step
- **Drag on an existing text box (> 5px movement before release)** → reposition the box; lands in selected state (toolbar visible, not editing)
- **Click outside any text box** → deselect, dismiss toolbar
- **Escape while in edit mode** → deselect
- **Escape while selected** → deselect
- **Delete or Backspace while selected** → delete the text box

## Consequences

A text box created by clicking but left empty (no content typed before deselection) is discarded silently — an empty box has no value and represents a misclick or abandoned intent.

Drag and click are disambiguated by a 5px pointer movement threshold on pointerdown. The box is elevated (z-index) at drag start regardless of prior selection state to ensure it renders above the sibling page during cross-page drags.

The floating toolbar is visible in both selected state and edit mode, since `selectedId` is always set when editing.

## Alternatives Considered

**Single-click selects, double-click edits:** Adds a gesture layer that slows down the primary writing action. Rejected.

**Single-click selects, second click edits (original model):** Required two separate interactions to start typing or drag. Rejected — the intermediate selection state added friction with no user benefit.
