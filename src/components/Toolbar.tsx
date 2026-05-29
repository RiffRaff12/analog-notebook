import type { TextBox } from '../modules'
import type { NotebookActions } from '../hooks/useNotebook'

const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches

interface Props {
  box: TextBox
  actions: NotebookActions
  anchorRect: DOMRect | null
  spreadRect: DOMRect | null
  containerRect: DOMRect | null
}

export function Toolbar({ box, actions, anchorRect, spreadRect, containerRect }: Props) {
  if (!anchorRect || !spreadRect || !containerRect) return null

  const TOOLBAR_HEIGHT = isTouch ? 52 : 40
  const TOOLBAR_WIDTH = isTouch ? 220 : 180
  const FLIP_THRESHOLD = 48

  const topRelative = anchorRect.top - containerRect.top
  const flipBelow = topRelative < FLIP_THRESHOLD + TOOLBAR_HEIGHT

  const spreadLeft = spreadRect.left - containerRect.left
  const spreadRight = spreadRect.right - containerRect.left

  let left = anchorRect.left - containerRect.left
  left = Math.max(spreadLeft, Math.min(left, spreadRight - TOOLBAR_WIDTH))

  const top = flipBelow
    ? anchorRect.bottom - containerRect.top + 4
    : anchorRect.top - containerRect.top - TOOLBAR_HEIGHT - 4

  return (
    <div
      className={`absolute flex items-center bg-white border border-stone-200 rounded-lg shadow-md text-xs ${isTouch ? 'gap-1.5 px-3 py-2' : 'gap-1 px-2 py-1'}`}
      style={{ left, top, height: TOOLBAR_HEIGHT, zIndex: 50 }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
    >
      {(['S', 'M', 'L'] as const).map((label, i) => {
        const sizes = [12, 16, 20] as const
        const size = sizes[i]
        return (
          <button
            key={label}
            className={`rounded font-[Caveat] font-bold transition-colors ${isTouch ? 'px-3 py-2' : 'px-1.5 py-0.5'} ${
              box.fontSize === size
                ? 'bg-stone-800 text-white'
                : 'hover:bg-stone-100 text-stone-600'
            }`}
            style={{ fontSize: size === 12 ? 11 : size === 16 ? 13 : 15, minHeight: isTouch ? 36 : undefined }}
            onClick={() => actions.updateFontSize(box.id, size)}
          >
            {label}
          </button>
        )
      })}
      <div className="w-px h-5 bg-stone-200 mx-0.5" />
      <button
        className={`rounded font-[Caveat] transition-colors ${isTouch ? 'px-3 py-2' : 'px-1.5 py-0.5'} ${
          box.isStruck
            ? 'bg-stone-800 text-white'
            : 'hover:bg-stone-100 text-stone-600'
        }`}
        style={{ textDecoration: 'line-through', fontSize: 13, minHeight: isTouch ? 36 : undefined }}
        onClick={() => actions.toggleStrikethrough(box.id)}
        title="Strikethrough"
      >
        S
      </button>
      <button
        className={`rounded hover:bg-red-50 text-red-500 transition-colors flex items-center justify-center ${isTouch ? 'px-3 py-2' : 'px-1.5 py-0.5'}`}
        style={{ minHeight: isTouch ? 36 : undefined }}
        onClick={() => actions.deleteTextBox(box.id)}
        title="Delete"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </div>
  )
}
