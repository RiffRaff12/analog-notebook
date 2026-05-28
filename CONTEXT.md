# Analog Notebook — Domain Glossary

## Notebook
A named collection of spreads. The top-level unit of organisation. A user may have multiple notebooks for different contexts. A notebook remembers the last spread index the user visited (`lastSpreadIndex`).

## Spread
A two-page view consisting of exactly one left page and one right page, rendered side-by-side to fill the viewport. The atomic navigation unit — users move between spreads, not individual pages. Spread 1 contains pages 1–2, spread 2 contains pages 3–4, and so on.

## Page
One half of a spread. Identified by `pageIndex`: `0` for the left page, `1` for the right page. Page numbers are displayed at the bottom outer corner of each page (left page: bottom-left; right page: bottom-right).

## Text Box
A positioned unit of plain text on a page. Anchored by its top-left corner at a click position. Width extends from the click x-position to the right edge of the page. Height grows downward as content wraps, clamped at the page bottom boundary. Rendered in the Caveat font at one of three sizes: 12pt (small), 16pt (medium, default), or 20pt (large).

## Strikethrough
A visual state on a text box indicating the item is done. Renders CSS `text-decoration: line-through` plus reduced opacity. Toggled via Cmd/Ctrl+D or the floating toolbar. Reversible.

## Selection
The state in which a text box is chosen for action but not accepting keyboard input. Displays the floating toolbar. Reached by: completing a drag gesture, or pressing Escape from edit mode.

## Edit Mode
The state in which a text box is actively accepting keyboard input. Entered by: (1) clicking empty space to create a new text box, or (2) clicking any existing text box. The floating toolbar remains visible during edit mode. Exited by clicking outside or pressing Escape (transitions to deselected).

## Floating Toolbar
A contextual action bar that appears above (or below if near the top of the spread) a selected text box. Contains: font size picker (S/M/L), strikethrough toggle, and delete button. Dismissed when the text box is deselected.

## Active Notebook
The notebook currently open and displayed. Only one notebook is active at a time. Managed by NotebookManager.

## Empty State
The UI screen shown when no notebooks exist — reached only after the user has explicitly deleted all notebooks. Prompts the user to create a new one. Not shown on first launch (a default notebook is auto-created instead).

## System Font
The font used for all chrome UI elements: page numbers, notebook title, and dropdown. Distinct from content font. Uses Inter (sans-serif). Signals "interface" rather than "notebook".

## Content Font
The font used for text box content. Uses Caveat (handwriting). Signals "written on paper".

## Dot Grid
The dot pattern rendered on each page. Spaced at 5mm intervals to match Leuchtturm density. Rendered via CSS radial-gradient.

## Scale Factor
The computed ratio used to fit the fixed A5×2 spread dimensions into the current viewport. Calculated by PageScaler. All coordinate rendering reads from this single value.

## Page-Relative Position
Text box coordinates expressed as a fraction (0–1) of the containing page's width and height, not as pixel values. Ensures placement is resolution-independent across all screen sizes.

## Spread Scroller
A permanent slim bar at the bottom of the viewport for quick spread navigation. Displays spread items as page-number ranges (e.g. "1–2", "3–4"). Centered on the active spread, with neighbors visible on each side. The active spread is highlighted with a filled pill. Animates as a carousel when the active spread changes. Hovering an item shows a **Spread Preview** floating above the hovered item.

## Spread Preview
A scaled-down rendering of a full spread (dot grid + all text boxes) shown on hover over a Spread Scroller item. Appears directly above the hovered item. Transient — visible only while hovering.

## Image Box
A positioned image on a page, created by pasting from the clipboard via the Context Menu. Anchored by its top-left corner. Width and height are stored as page-relative fractions. Initial size is scaled to fit the page width while preserving the image's aspect ratio. Clamped to the page boundary when moved or resized. Resized via corner and edge handles. Deleted via Backspace. Has no Floating Toolbar. When multiple items overlap, the most recently placed or selected item renders on top.

## Context Menu
A right-click menu that appears on any page area. Currently contains one action: "Paste Image". The action is disabled when the clipboard holds no image data. Selecting "Paste Image" creates an Image Box at the right-click position.
