# ADR 0002: Text Box Width Anchored at Click Position

**Status:** Accepted

## Context

Text boxes need an initial width. The choice directly affects how natural writing feels and how the coordinate model works.

## Decision

A text box's left edge is anchored at the x-position of the click. Its right edge is anchored at the right boundary of the containing page. Width is therefore implicit — derived from click position and page boundary — and is not stored in the data model.

Text wraps at the right page edge and grows downward. Height is clamped at the page bottom boundary. Only `x`, `y`, and `content` are needed to reconstruct layout.

## Consequences

Clicking near the left margin produces a wide text box. Clicking near the right margin produces a narrow one. This mirrors putting a pen down on paper and writing to the margin — placement determines line length naturally.

No explicit `width` field in the TextBox schema. Width is always computed at render time from `x` and the page's rendered pixel width.

## Alternatives Considered

**Fixed initial width (~40% of page):** Predictable but ignores click position. A text box starting at the right side of the page would extend off-page. Rejected.

**Grows in both directions from click point:** Unpredictable and conflicts with the drag repositioning model. Rejected.
